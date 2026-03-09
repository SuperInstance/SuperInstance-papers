/**
 * Garden Controls - Interactive Controls for Cell Garden
 *
 * Provides user interface controls for manipulating the
 * cell garden visualization.
 */

import { LayoutType } from './NetworkLayout.js';
import type { CellType, CellState } from '../../core/types.js';

/**
 * Control configuration
 */
export interface GardenControlsConfig {
  onLayoutChange?: (layout: LayoutType) => void;
  onFilterChange?: (filters: CellFilters) => void;
  onZoomChange?: (zoom: number) => void;
  onExport?: (format: 'png' | 'jpeg' | 'svg') => void;
  onReset?: () => void;
  availableLayouts?: LayoutType[];
  showExport?: boolean;
  showFilter?: boolean;
  showZoom?: boolean;
}

/**
 * Cell filters
 */
export interface CellFilters {
  types: CellType[];
  states: CellState[];
  searchQuery: string;
  minActivity: number;
  maxActivity: number;
}

/**
 * Default cell filters
 */
export const DEFAULT_FILTERS: CellFilters = {
  types: [],
  states: [],
  searchQuery: '',
  minActivity: 0,
  maxActivity: 1,
};

/**
 * Garden Controls Component Class
 */
export class GardenControls {
  private container: HTMLElement;
  private config: Required<GardenControlsConfig>;
  private currentLayout: LayoutType = LayoutType.FORCE_DIRECTED;
  private currentFilters: CellFilters = { ...DEFAULT_FILTERS };
  private currentZoom: number = 1;
  private controlsContainer: HTMLElement | null = null;

  constructor(container: HTMLElement, config: GardenControlsConfig) {
    this.container = container;
    this.config = {
      onLayoutChange: config.onLayoutChange ?? (() => {}),
      onFilterChange: config.onFilterChange ?? (() => {}),
      onZoomChange: config.onZoomChange ?? (() => {}),
      onExport: config.onExport ?? (() => {}),
      onReset: config.onReset ?? (() => {}),
      availableLayouts: config.availableLayouts ?? [
        LayoutType.FORCE_DIRECTED,
        LayoutType.CIRCULAR,
        LayoutType.HIERARCHICAL,
        LayoutType.GRID,
        LayoutType.SPATIAL,
      ],
      showExport: config.showExport ?? true,
      showFilter: config.showFilter ?? true,
      showZoom: config.showZoom ?? true,
    };

    this.render();
  }

  /**
   * Render controls
   */
  private render(): void {
    this.container.innerHTML = '';
    this.controlsContainer = this.createControlsContainer();
    this.container.appendChild(this.controlsContainer);
  }

  /**
   * Create main controls container
   */
  private createControlsContainer(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'garden-controls';
    container.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 16px;
      background: rgba(26, 26, 46, 0.95);
      border-radius: 8px;
      color: #fff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;

    // Title
    const title = document.createElement('div');
    title.textContent = 'Cell Garden Controls';
    title.style.cssText = `
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 4px;
      color: #4CAF50;
    `;
    container.appendChild(title);

    // Layout selector
    container.appendChild(this.createLayoutSelector());

    // Filter controls
    if (this.config.showFilter) {
      container.appendChild(this.createFilterControls());
    }

    // Zoom controls
    if (this.config.showZoom) {
      container.appendChild(this.createZoomControls());
    }

    // Export controls
    if (this.config.showExport) {
      container.appendChild(this.createExportControls());
    }

    // Reset button
    container.appendChild(this.createResetButton());

    return container;
  }

  /**
   * Create layout selector
   */
  private createLayoutSelector(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'control-group';

    const label = document.createElement('label');
    label.textContent = 'Layout:';
    label.style.cssText = `
      display: block;
      margin-bottom: 6px;
      font-weight: 500;
      color: #aaa;
    `;
    container.appendChild(label);

    const select = document.createElement('select');
    select.style.cssText = `
      width: 100%;
      padding: 8px;
      border: 1px solid #444;
      border-radius: 4px;
      background: #2a2a3e;
      color: #fff;
      cursor: pointer;
    `;

    this.config.availableLayouts.forEach(layout => {
      const option = document.createElement('option');
      option.value = layout;
      option.textContent = this.formatLayoutName(layout);
      if (layout === this.currentLayout) {
        option.selected = true;
      }
      select.appendChild(option);
    });

    select.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      this.currentLayout = target.value as LayoutType;
      this.config.onLayoutChange(this.currentLayout);
    });

    container.appendChild(select);
    return container;
  }

  /**
   * Create filter controls
   */
  private createFilterControls(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'control-group';

    const label = document.createElement('label');
    label.textContent = 'Filters:';
    label.style.cssText = `
      display: block;
      margin-bottom: 6px;
      font-weight: 500;
      color: #aaa;
    `;
    container.appendChild(label);

    // Search input
    const searchContainer = document.createElement('div');
    searchContainer.style.marginBottom = '8px';

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search cells...';
    searchInput.style.cssText = `
      width: 100%;
      padding: 8px;
      border: 1px solid #444;
      border-radius: 4px;
      background: #2a2a3e;
      color: #fff;
      box-sizing: border-box;
    `;

    searchInput.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      this.currentFilters.searchQuery = target.value;
      this.config.onFilterChange(this.currentFilters);
    });

    searchContainer.appendChild(searchInput);
    container.appendChild(searchContainer);

    // Cell type filter
    const typeFilterContainer = this.createMultiSelectFilter(
      'Cell Types',
      Object.values(['input', 'output', 'transform', 'filter', 'aggregate', 'analysis', 'prediction', 'decision', 'explain']),
      (types) => {
        this.currentFilters.types = types as CellType[];
        this.config.onFilterChange(this.currentFilters);
      }
    );
    container.appendChild(typeFilterContainer);

    // Cell state filter
    const stateFilterContainer = this.createMultiSelectFilter(
      'Cell States',
      ['dormant', 'sensing', 'processing', 'emitting', 'learning', 'error'],
      (states) => {
        this.currentFilters.states = states as CellState[];
        this.config.onFilterChange(this.currentFilters);
      }
    );
    container.appendChild(stateFilterContainer);

    return container;
  }

  /**
   * Create multi-select filter
   */
  private createMultiSelectFilter(
    label: string,
    options: string[],
    onChange: (selected: string[]) => void
  ): HTMLElement {
    const container = document.createElement('div');
    container.style.marginBottom = '8px';

    const labelEl = document.createElement('div');
    labelEl.textContent = label;
    labelEl.style.cssText = `
      font-size: 12px;
      color: #888;
      margin-bottom: 4px;
    `;
    container.appendChild(labelEl);

    const optionsContainer = document.createElement('div');
    optionsContainer.style.cssText = `
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    `;

    const selectedOptions = new Set<string>();

    options.forEach(option => {
      const checkbox = document.createElement('label');
      checkbox.style.cssText = `
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 12px;
        cursor: pointer;
      `;

      const input = document.createElement('input');
      input.type = 'checkbox';
      input.value = option;

      input.addEventListener('change', () => {
        if (input.checked) {
          selectedOptions.add(option);
        } else {
          selectedOptions.delete(option);
        }
        onChange(Array.from(selectedOptions));
      });

      const text = document.createElement('span');
      text.textContent = option;
      text.style.textTransform = 'capitalize';

      checkbox.appendChild(input);
      checkbox.appendChild(text);
      optionsContainer.appendChild(checkbox);
    });

    container.appendChild(optionsContainer);
    return container;
  }

  /**
   * Create zoom controls
   */
  private createZoomControls(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'control-group';

    const label = document.createElement('label');
    label.textContent = 'Zoom:';
    label.style.cssText = `
      display: block;
      margin-bottom: 6px;
      font-weight: 500;
      color: #aaa;
    `;
    container.appendChild(label);

    const controls = document.createElement('div');
    controls.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
    `;

    // Zoom out button
    const zoomOutBtn = this.createButton('-', () => {
      this.currentZoom = Math.max(0.1, this.currentZoom - 0.1);
      this.config.onZoomChange(this.currentZoom);
    });

    // Zoom slider
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0.1';
    slider.max = '3';
    slider.step = '0.1';
    slider.value = this.currentZoom.toString();
    slider.style.cssText = `
      flex: 1;
      height: 4px;
      background: #444;
      border-radius: 2px;
      outline: none;
    `;

    slider.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      this.currentZoom = parseFloat(target.value);
      this.config.onZoomChange(this.currentZoom);
    });

    // Zoom in button
    const zoomInBtn = this.createButton('+', () => {
      this.currentZoom = Math.min(3, this.currentZoom + 0.1);
      this.config.onZoomChange(this.currentZoom);
    });

    // Reset zoom button
    const resetZoomBtn = this.createButton('Reset', () => {
      this.currentZoom = 1;
      slider.value = '1';
      this.config.onZoomChange(this.currentZoom);
    });

    controls.appendChild(zoomOutBtn);
    controls.appendChild(slider);
    controls.appendChild(zoomInBtn);
    controls.appendChild(resetZoomBtn);
    container.appendChild(controls);

    // Zoom level display
    const zoomDisplay = document.createElement('div');
    zoomDisplay.textContent = `${Math.round(this.currentZoom * 100)}%`;
    zoomDisplay.style.cssText = `
      text-align: center;
      font-size: 12px;
      color: #888;
      margin-top: 4px;
    `;
    container.appendChild(zoomDisplay);

    return container;
  }

  /**
   * Create export controls
   */
  private createExportControls(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'control-group';

    const label = document.createElement('label');
    label.textContent = 'Export:';
    label.style.cssText = `
      display: block;
      margin-bottom: 6px;
      font-weight: 500;
      color: #aaa;
    `;
    container.appendChild(label);

    const buttonGroup = document.createElement('div');
    buttonGroup.style.cssText = `
      display: flex;
      gap: 8px;
    `;

    const pngBtn = this.createButton('PNG', () => {
      this.config.onExport('png');
    });

    const jpegBtn = this.createButton('JPEG', () => {
      this.config.onExport('jpeg');
    });

    buttonGroup.appendChild(pngBtn);
    buttonGroup.appendChild(jpegBtn);
    container.appendChild(buttonGroup);

    return container;
  }

  /**
   * Create reset button
   */
  private createResetButton(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'control-group';

    const button = this.createButton('Reset All', () => {
      this.currentLayout = LayoutType.FORCE_DIRECTED;
      this.currentFilters = { ...DEFAULT_FILTERS };
      this.currentZoom = 1;
      this.config.onReset();
      this.render(); // Re-render to reset UI
    });

    button.style.cssText = `
      width: 100%;
      padding: 10px;
      background: #F44336;
      border: none;
      border-radius: 4px;
      color: #fff;
      cursor: pointer;
      font-weight: 500;
      transition: background 0.2s;
    `;

    button.addEventListener('mouseenter', () => {
      button.style.background = '#D32F2F';
    });

    button.addEventListener('mouseleave', () => {
      button.style.background = '#F44336';
    });

    container.appendChild(button);
    return container;
  }

  /**
   * Create a styled button
   */
  private createButton(text: string, onClick: () => void): HTMLButtonElement {
    const button = document.createElement('button');
    button.textContent = text;
    button.style.cssText = `
      padding: 8px 12px;
      background: #2196F3;
      border: none;
      border-radius: 4px;
      color: #fff;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: background 0.2s;
    `;

    button.addEventListener('mouseenter', () => {
      button.style.background = '#1976D2';
    });

    button.addEventListener('mouseleave', () => {
      button.style.background = '#2196F3';
    });

    button.addEventListener('click', onClick);
    return button;
  }

  /**
   * Format layout name for display
   */
  private formatLayoutName(layout: LayoutType): string {
    const names: Record<LayoutType, string> = {
      [LayoutType.FORCE_DIRECTED]: 'Force Directed',
      [LayoutType.CIRCULAR]: 'Circular',
      [LayoutType.HIERARCHICAL]: 'Hierarchical',
      [LayoutType.GRID]: 'Grid',
      [LayoutType.SPATIAL]: 'Spatial',
    };
    return names[layout] || layout;
  }

  /**
   * Get current layout
   */
  getCurrentLayout(): LayoutType {
    return this.currentLayout;
  }

  /**
   * Get current filters
   */
  getCurrentFilters(): CellFilters {
    return { ...this.currentFilters };
  }

  /**
   * Get current zoom level
   */
  getCurrentZoom(): number {
    return this.currentZoom;
  }

  /**
   * Update layout programmatically
   */
  setLayout(layout: LayoutType): void {
    this.currentLayout = layout;
    this.render();
  }

  /**
   * Update filters programmatically
   */
  setFilters(filters: Partial<CellFilters>): void {
    this.currentFilters = { ...this.currentFilters, ...filters };
    this.render();
  }

  /**
   * Update zoom programmatically
   */
  setZoom(zoom: number): void {
    this.currentZoom = Math.max(0.1, Math.min(3, zoom));
    this.render();
  }

  /**
   * Destroy controls
   */
  destroy(): void {
    if (this.controlsContainer && this.controlsContainer.parentNode) {
      this.controlsContainer.parentNode.removeChild(this.controlsContainer);
    }
  }
}

/**
 * Create tooltip for node info
 */
export class GardenTooltip {
  private tooltip: HTMLElement;
  private visible = false;

  constructor() {
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'garden-tooltip';
    this.tooltip.style.cssText = `
      position: absolute;
      padding: 12px;
      background: rgba(26, 26, 46, 0.95);
      border: 1px solid #444;
      border-radius: 6px;
      color: #fff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 13px;
      pointer-events: none;
      z-index: 1000;
      max-width: 300px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
      display: none;
    `;
    document.body.appendChild(this.tooltip);
  }

  show(x: number, y: number, content: TooltipContent): void {
    this.tooltip.innerHTML = this.renderContent(content);
    this.tooltip.style.display = 'block';
    this.visible = true;
    this.position(x, y);
  }

  hide(): void {
    this.tooltip.style.display = 'none';
    this.visible = false;
  }

  private position(x: number, y: number): void {
    const padding = 10;
    let posX = x + padding;
    let posY = y + padding;

    // Keep tooltip within viewport
    const rect = this.tooltip.getBoundingClientRect();
    if (posX + rect.width > window.innerWidth) {
      posX = x - rect.width - padding;
    }
    if (posY + rect.height > window.innerHeight) {
      posY = y - rect.height - padding;
    }

    this.tooltip.style.left = `${posX}px`;
    this.tooltip.style.top = `${posY}px`;
  }

  private renderContent(content: TooltipContent): string {
    return `
      <div style="font-weight: 600; margin-bottom: 8px; color: #4CAF50;">
        ${content.id}
      </div>
      <div style="display: grid; grid-template-columns: auto 1fr; gap: 4px 8px; font-size: 12px;">
        <span style="color: #888;">Type:</span>
        <span style="text-transform: capitalize;">${content.type}</span>

        <span style="color: #888;">State:</span>
        <span style="text-transform: capitalize; color: ${this.getStateColor(content.state)};">
          ${content.state}
        </span>

        <span style="color: #888;">Position:</span>
        <span>(${content.position?.row ?? '?'}, ${content.position?.col ?? '?'})</span>

        <span style="color: #888;">Activity:</span>
        <span>${(content.activity ?? 0).toFixed(2)}</span>

        <span style="color: #888;">Confidence:</span>
        <span>${(content.confidence ?? 0).toFixed(2)}</span>

        ${content.lastExecution ? `
          <span style="color: #888;">Last Exec:</span>
          <span>${this.formatTime(content.lastExecution)}</span>
        ` : ''}
      </div>
      ${content.description ? `
        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #444; font-size: 12px; line-height: 1.4;">
          ${content.description}
        </div>
      ` : ''}
    `;
  }

  private getStateColor(state: string): string {
    const colors: Record<string, string> = {
      dormant: '#9E9E9E',
      sensing: '#FFEB3B',
      processing: '#2196F3',
      emitting: '#4CAF50',
      learning: '#9C27B0',
      error: '#F44336',
    };
    return colors[state] || '#fff';
  }

  private formatTime(timestamp: number): string {
    const diff = Date.now() - timestamp;
    if (diff < 1000) return `${diff}ms ago`;
    if (diff < 60000) return `${Math.round(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.round(diff / 60000)}m ago`;
    return `${Math.round(diff / 3600000)}h ago`;
  }

  destroy(): void {
    if (this.tooltip.parentNode) {
      this.tooltip.parentNode.removeChild(this.tooltip);
    }
  }
}

/**
 * Tooltip content interface
 */
export interface TooltipContent {
  id: string;
  type: string;
  state: string;
  position?: { row: number; col: number };
  activity?: number;
  confidence?: number;
  lastExecution?: number;
  description?: string;
}
