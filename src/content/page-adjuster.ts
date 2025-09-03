export class PageAdjuster {
  private sidebarWidth: number = 350;
  private isOpen: boolean = false;
  private originalStyles: Map<Element, { [key: string]: string }> = new Map();
  private sidebarFrame: HTMLIFrameElement | null = null;
  private resizeObserver: ResizeObserver | null = null;

  constructor() {
    // Load saved width from storage
    this.loadSavedWidth();
  }

  private async loadSavedWidth() {
    try {
      const result = await chrome.storage.local.get(['sidebarWidth']);
      if (result.sidebarWidth) {
        this.sidebarWidth = result.sidebarWidth;
      }
    } catch (error) {
      console.error('Failed to load sidebar width:', error);
    }
  }

  openSidebar(): void {
    if (this.isOpen) return;

    // Create iframe for React sidebar
    this.sidebarFrame = document.createElement('iframe');
    this.sidebarFrame.id = 'ai-assistant-sidebar';
    this.sidebarFrame.src = chrome.runtime.getURL('dist/src/sidebar/index.html');
    
    // Style the iframe
    this.sidebarFrame.style.cssText = `
      position: fixed;
      top: 0;
      right: 0;
      width: ${this.sidebarWidth}px;
      height: 100vh;
      border: none;
      border-left: 1px solid #e5e7eb;
      z-index: 2147483647;
      background: white;
      box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
    `;

    // Adjust page layout
    this.adjustPageLayout();

    // Append sidebar
    document.documentElement.appendChild(this.sidebarFrame);
    this.isOpen = true;

    // Setup resize observer to handle viewport changes
    this.setupResizeObserver();
  }

  private adjustPageLayout(): void {
    const html = document.documentElement;
    const body = document.body;

    // Store original styles
    this.originalStyles.set(html, {
      width: html.style.width || '',
      marginRight: html.style.marginRight || '',
      position: html.style.position || '',
      overflow: html.style.overflow || '',
      transition: html.style.transition || ''
    });
    
    this.originalStyles.set(body, {
      width: body.style.width || '',
      marginRight: body.style.marginRight || '',
      transform: body.style.transform || '',
      transition: body.style.transition || ''
    });

    // Method 1: Adjust HTML width and margin
    html.style.transition = 'all 0.3s ease-in-out';
    html.style.width = `calc(100% - ${this.sidebarWidth}px)`;
    html.style.position = 'relative';
    html.style.overflow = 'auto';
    
    // Method 2: Also transform the body for better compatibility
    body.style.transition = 'transform 0.3s ease-in-out';
    body.style.transform = `translateX(-${this.sidebarWidth}px)`;
    body.style.width = `calc(100% + ${this.sidebarWidth}px)`;

    // Handle fixed elements
    this.adjustFixedElements();
  }

  private adjustFixedElements(): void {
    // Find all fixed positioned elements
    const allElements = document.querySelectorAll('*');
    
    allElements.forEach(element => {
      const computed = window.getComputedStyle(element);
      
      if (computed.position === 'fixed') {
        const el = element as HTMLElement;
        const right = computed.right;
        const left = computed.left;
        
        // Store original styles
        this.originalStyles.set(element, {
          transform: el.style.transform || '',
          right: el.style.right || '',
          left: el.style.left || '',
          width: el.style.width || ''
        });

        // Adjust position based on element's alignment
        if (right !== 'auto' && left === 'auto') {
          // Right-aligned fixed element
          const rightValue = parseFloat(right) || 0;
          if (rightValue < 100) {
            el.style.transform = `translateX(-${this.sidebarWidth}px)`;
          }
        } else if (left !== 'auto' && right !== 'auto') {
          // Full-width fixed element
          el.style.width = `calc(100% - ${this.sidebarWidth}px)`;
        }
      }
    });
  }

  closeSidebar(): void {
    if (!this.isOpen) return;

    const html = document.documentElement;
    const body = document.body;

    // Reset all stored original styles
    this.originalStyles.forEach((styles, element) => {
      const el = element as HTMLElement;
      Object.entries(styles).forEach(([prop, value]) => {
        (el.style as any)[prop] = value;
      });
    });

    // Clear stored styles
    this.originalStyles.clear();

    // Remove sidebar
    this.sidebarFrame?.remove();
    this.sidebarFrame = null;
    this.isOpen = false;

    // Clean up resize observer
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
  }

  resizeSidebar(newWidth: number): void {
    this.sidebarWidth = Math.max(250, Math.min(600, newWidth));
    
    // Save new width to storage
    try {
      chrome.storage.local.set({ sidebarWidth: this.sidebarWidth });
    } catch (error) {
      // Extension context was invalidated, ignore
      console.log('Extension context invalidated while saving width');
    }

    if (this.sidebarFrame) {
      this.sidebarFrame.style.width = `${this.sidebarWidth}px`;
      
      // Re-adjust page layout with new width
      const html = document.documentElement;
      const body = document.body;
      
      // Update HTML width
      html.style.width = `calc(100% - ${this.sidebarWidth}px)`;
      
      // Update body transform
      body.style.transform = `translateX(-${this.sidebarWidth}px)`;
      body.style.width = `calc(100% + ${this.sidebarWidth}px)`;

      // Re-adjust fixed elements
      this.originalStyles.forEach((_, element) => {
        const el = element as HTMLElement;
        const computed = window.getComputedStyle(el);
        
        if (computed.position === 'fixed' && element !== html) {
          const right = computed.right;
          const left = computed.left;
          
          if (right !== 'auto' && left === 'auto') {
            const rightValue = parseFloat(right) || 0;
            if (rightValue < 100) {
              el.style.transform = `translateX(-${this.sidebarWidth}px)`;
            }
          } else if (left !== 'auto' && right !== 'auto') {
            el.style.width = `calc(100% - ${this.sidebarWidth}px)`;
          }
        }
      });
    }
  }

  toggleSidebar(): void {
    if (this.isOpen) {
      this.closeSidebar();
    } else {
      this.openSidebar();
    }
  }

  isVisible(): boolean {
    return this.isOpen;
  }

  private setupResizeObserver(): void {
    // Watch for viewport resize to adjust sidebar height
    this.resizeObserver = new ResizeObserver(() => {
      if (this.sidebarFrame) {
        this.sidebarFrame.style.height = `${window.innerHeight}px`;
      }
    });

    this.resizeObserver.observe(document.body);
  }

  // Extract page context for AI
  extractPageContext(): string {
    // Temporarily hide sidebar to get clean text
    const sidebarDisplay = this.sidebarFrame?.style.display;
    if (this.sidebarFrame) {
      this.sidebarFrame.style.display = 'none';
    }

    // Get visible text content
    const selection = window.getSelection();
    let text = '';

    if (selection && selection.toString().trim()) {
      // Use selected text if available
      text = selection.toString();
    } else {
      // Get all visible text
      const elements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, td, th, span, div, article, section');
      const textContent: string[] = [];

      elements.forEach(el => {
        const rect = el.getBoundingClientRect();
        // Check if element is visible
        if (rect.top < window.innerHeight && rect.bottom > 0 && rect.width > 0 && rect.height > 0) {
          const content = (el.textContent || '').trim();
          if (content && !textContent.includes(content)) {
            textContent.push(content);
          }
        }
      });

      text = textContent.join('\n').substring(0, 8000); // Limit to 8000 chars
    }

    // Restore sidebar display
    if (this.sidebarFrame && sidebarDisplay !== undefined) {
      this.sidebarFrame.style.display = sidebarDisplay;
    }

    return text;
  }
}