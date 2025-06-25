/**
 * UI/UX Research Agent
 * 
 * Specializes in user interface analysis, design pattern research,
 * and user experience evaluation using Stagehand browser automation.
 */

import { Agent } from '@mastra/core/agent';
import type { Logger } from '@mastra/loggers';
import type { MCPClient } from '@mastra/mcp';
import { vertexai } from '@ai-sdk/vertexai';
import { type SynthesisRequest, SynthesisResponse } from '../synthesis/router.js';

export interface UIUXResearchContext {
  competitors?: string[];
  websites?: string[];
  userFlows?: string[];
  designPatterns?: string[];
  industries?: string[];
  targetDevice?: 'desktop' | 'mobile' | 'tablet' | 'all';
  captureScreenshots?: boolean;
  interactionDepth?: 'basic' | 'detailed' | 'comprehensive';
  accessibilityAnalysis?: boolean;
}

export interface UIUXResearchResult {
  interfaceAnalysis: InterfaceAnalysis[];
  designPatterns: DesignPatternAnalysis[];
  userFlowMaps: UserFlowMap[];
  accessibilityReport?: AccessibilityReport;
  competitiveComparison: CompetitiveUIComparison;
  bestPractices: UIUXBestPractice[];
  visualAssets: VisualAsset[];
  sources: string[];
}

export interface InterfaceAnalysis {
  website: string;
  pageType: string;
  layout: LayoutAnalysis;
  components: ComponentAnalysis[];
  colorScheme: ColorScheme;
  typography: TypographyAnalysis;
  interactionPatterns: string[];
  strengthsAndWeaknesses: {
    strengths: string[];
    weaknesses: string[];
  };
}

export interface LayoutAnalysis {
  structure: string;
  responsiveness: string;
  navigationPattern: string;
  contentHierarchy: string[];
  whiteSpaceUsage: string;
  gridSystem?: string;
}

export interface ComponentAnalysis {
  name: string;
  description: string;
  purpose: string;
  location: string;
  interactivity: string[];
  visualStyle: string;
  accessibility: string;
}

export interface ColorScheme {
  primary: string[];
  secondary: string[];
  accent: string[];
  neutral: string[];
  semanticColors: {
    success: string;
    error: string;
    warning: string;
    info: string;
  };
  contrastRatio: string;
}

export interface TypographyAnalysis {
  headingFont: string;
  bodyFont: string;
  fontPairings: string[];
  sizeHierarchy: string[];
  readability: string;
  responsiveScaling: string;
}

export interface DesignPatternAnalysis {
  pattern: string;
  description: string;
  useCases: string[];
  examples: PatternExample[];
  effectiveness: string;
  implementation: string;
  accessibility: string;
}

export interface PatternExample {
  website: string;
  pageUrl: string;
  description: string;
  screenshot?: string;
}

export interface UserFlowMap {
  name: string;
  description: string;
  steps: UserFlowStep[];
  painPoints: string[];
  opportunities: string[];
  conversionRate?: string;
}

export interface UserFlowStep {
  step: number;
  page: string;
  action: string;
  userGoal: string;
  interfaceElements: string[];
  screenshot?: string;
  timeEstimate?: string;
}

export interface AccessibilityReport {
  wcagCompliance: string;
  keyIssues: AccessibilityIssue[];
  bestPractices: string[];
  overallScore: string;
}

export interface AccessibilityIssue {
  issue: string;
  impact: 'high' | 'medium' | 'low';
  wcagCriteria: string;
  affectedElements: string[];
  recommendation: string;
}

export interface CompetitiveUIComparison {
  summary: string;
  comparisonMatrix: UIComparisonMatrix[];
  strengthsMap: Record<string, string[]>;
  weaknessesMap: Record<string, string[]>;
  innovativeFeatures: Record<string, string[]>;
  recommendations: string[];
}

export interface UIComparisonMatrix {
  feature: string;
  competitors: Record<string, {
    implementation: string;
    effectiveness: 'high' | 'medium' | 'low';
    notes: string;
  }>;
}

export interface UIUXBestPractice {
  category: string;
  practice: string;
  rationale: string;
  examples: string[];
  implementation: string;
}

export interface VisualAsset {
  type: 'screenshot' | 'flowchart' | 'heatmap' | 'wireframe';
  description: string;
  url: string;
  website?: string;
  page?: string;
  format: string;
  timestamp: string;
}

/**
 * UI/UX Research Agent - Specialized for interface analysis and design patterns
 */
export class UIUXResearchAgent extends Agent {
  private mcpClient: MCPClient;
  protected logger: any; // Using any to avoid type conflicts
  private cache = new Map<string, any>();
  private cacheExpiry = new Map<string, number>();

  constructor(mcpClient: MCPClient, logger: Logger) {
    const options = {
      name: 'UIUXResearchAgent',
      description: 'Specialized agent for UI/UX analysis and design pattern research',
      instructions: `
        You are a UI/UX research specialist focused on:
        1. Interface analysis and component evaluation
        2. Design pattern identification and assessment
        3. User flow mapping and experience evaluation
        4. Accessibility analysis and recommendations
        5. Competitive UI/UX benchmarking
        
        Always provide visual evidence and specific examples.
        Focus on actionable insights and implementation guidance.
        Include both aesthetic and functional aspects in your analysis.
      `,
      model: vertexai("gemini-2.5-flash"),
      tools: mcpClient.getToolsets ? mcpClient.getToolsets() : {}
    };
    
    super(options);
    
    this.mcpClient = mcpClient;
    this.logger = logger;
  }

  /**
   * Synthesize UI/UX research request
   */
  async synthesize(request: SynthesisRequest): Promise<UIUXResearchResult> {
    this.logger.info('Starting UI/UX research synthesis', { 
      operation: request.operation,
      tools: request.tools 
    });

    const context = request.context as UIUXResearchContext;
    const cacheKey = this.generateCacheKey(request);

    // Check cache first
    if (this.isCacheValid(cacheKey)) {
      this.logger.info('Returning cached UI/UX research result');
      return this.cache.get(cacheKey);
    }

    try {
      const result: UIUXResearchResult = {
        interfaceAnalysis: [],
        designPatterns: [],
        userFlowMaps: [],
        competitiveComparison: {
          summary: '',
          comparisonMatrix: [],
          strengthsMap: {},
          weaknessesMap: {},
          innovativeFeatures: {},
          recommendations: []
        },
        bestPractices: [],
        visualAssets: [],
        sources: []
      };

      // Step 1: Interface Analysis
      if (context.competitors?.length || context.websites?.length) {
        const websites = [...(context.competitors || []), ...(context.websites || [])];
        result.interfaceAnalysis = await this.analyzeInterfaces(websites, context);
      }

      // Step 2: Design Pattern Research
      if (context.designPatterns?.length) {
        result.designPatterns = await this.researchDesignPatterns(
          context.designPatterns,
          result.interfaceAnalysis
        );
      }

      // Step 3: User Flow Mapping
      if (context.userFlows?.length) {
        result.userFlowMaps = await this.mapUserFlows(context.userFlows, context);
      }

      // Step 4: Accessibility Analysis
      if (context.accessibilityAnalysis) {
        result.accessibilityReport = await this.analyzeAccessibility(result.interfaceAnalysis);
      }

      // Step 5: Competitive Comparison
      if (context.competitors?.length && context.competitors.length > 1) {
        result.competitiveComparison = await this.createCompetitiveComparison(
          context.competitors,
          result.interfaceAnalysis
        );
      }

      // Step 6: Best Practices
      result.bestPractices = await this.generateBestPractices(context, result);

      // Cache the result
      this.cacheResult(cacheKey, result);

      this.logger.info('UI/UX research synthesis completed', {
        interfacesAnalyzed: result.interfaceAnalysis.length,
        designPatternsResearched: result.designPatterns.length,
        userFlowsMapped: result.userFlowMaps.length,
        visualAssetsGenerated: result.visualAssets.length
      });

      return result;

    } catch (error) {
      this.logger.error('Error in UI/UX research synthesis', { error });
      throw error;
    }
  }

  /**
   * Analyze interfaces using Stagehand browser automation
   */
  private async analyzeInterfaces(
    websites: string[], 
    context: UIUXResearchContext
  ): Promise<InterfaceAnalysis[]> {
    const analyses: InterfaceAnalysis[] = [];

    for (const website of websites) {
      try {
        // Use Stagehand to navigate and analyze website
        const websiteUrl = this.formatWebsiteUrl(website);
        const snapshot = await this.captureWebsiteSnapshot(websiteUrl, context.targetDevice);
        
        // Extract interface elements
        const interfaceElements = await this.extractInterfaceElements(websiteUrl, snapshot);
        
        // Analyze layout and components
        const analysis = await this.createInterfaceAnalysis(website, interfaceElements, snapshot);
        
        // Add screenshots if requested
        if (context.captureScreenshots) {
          const screenshot = await this.captureScreenshot(websiteUrl);
          if (screenshot) {
            // Store screenshot in visual assets instead of directly on layout
            this.addVisualAsset('screenshot', website, websiteUrl, screenshot);
          }
        }
        
        analyses.push(analysis);
        
      } catch (error) {
        this.logger.warn(`Failed to analyze interface for ${website}`, { error });
        // Add fallback analysis
        analyses.push(this.createFallbackInterfaceAnalysis(website));
      }
    }

    return analyses;
  }

  /**
   * Format website URL with proper protocol
   */
  private formatWebsiteUrl(website: string): string {
    if (!website.startsWith('http://') && !website.startsWith('https://')) {
      return `https://${website}`;
    }
    return website;
  }

  /**
   * Capture website snapshot using Stagehand
   */
  private async captureWebsiteSnapshot(url: string, device?: string): Promise<any> {
    try {
      const tools = await this.mcpClient.getTools();
      const stagehandTools = tools.stagehand;
      
      if (stagehandTools && stagehandTools.browser_navigate && stagehandTools.browser_snapshot) {
        // Navigate to the website
        await this.mcpClient.getTools().then(tools => 
          tools.stagehand.browser_navigate({ url })
        );
        
        // Set viewport for device if specified
        if (device && device !== 'desktop') {
          const viewportSettings = this.getViewportForDevice(device);
          if (viewportSettings) {
            await this.mcpClient.getTools().then(tools => 
              tools.stagehand.browser_set_viewport(viewportSettings)
            );
          }
        }
        
        // Capture snapshot
        const snapshot = await this.mcpClient.getTools().then(tools => 
          tools.stagehand.browser_snapshot({})
        );
        return snapshot;
      }
    } catch (error) {
      this.logger.warn(`Failed to capture website snapshot for ${url}`, { error });
    }
    
    return null;
  }

  /**
   * Get viewport settings for different devices
   */
  private getViewportForDevice(device: string): { width: number; height: number } | null {
    switch (device) {
      case 'mobile':
        return { width: 375, height: 667 }; // iPhone 8
      case 'tablet':
        return { width: 768, height: 1024 }; // iPad
      default:
        return null;
    }
  }

  /**
   * Extract interface elements using Stagehand
   */
  private async extractInterfaceElements(url: string, snapshot: any): Promise<any> {
    try {
      const tools = await this.mcpClient.getTools();
      const stagehandTools = tools.stagehand;
      
      if (stagehandTools && stagehandTools.browser_extract) {
        const elements = await this.mcpClient.getTools().then(tools => 
          tools.stagehand.browser_extract({
            selectors: [
              'header', 'nav', 'main', 'footer', 
              '.btn, button', 
              'form', 'input', 
              '.card, .container',
              'h1, h2, h3',
              'p, a'
            ],
            attributes: ['class', 'id', 'style', 'role', 'aria-*']
          })
        );
        
        return elements;
      }
    } catch (error) {
      this.logger.warn(`Failed to extract interface elements for ${url}`, { error });
    }
    
    return null;
  }

  /**
   * Capture screenshot using Stagehand
   */
  private async captureScreenshot(url: string): Promise<string | null> {
    try {
      const tools = await this.mcpClient.getTools();
      const stagehandTools = tools.stagehand;
      
      if (stagehandTools && stagehandTools.browser_snapshot) {
        const result = await this.mcpClient.getTools().then(tools => 
          tools.stagehand.browser_snapshot({
            fullPage: true,
            format: 'jpeg',
            quality: 80
          })
        );
        
        return result.screenshot || null;
      }
    } catch (error) {
      this.logger.warn(`Failed to capture screenshot for ${url}`, { error });
    }
    
    return null;
  }

  /**
   * Create interface analysis from extracted elements
   */
  private async createInterfaceAnalysis(
    website: string, 
    elements: any, 
    snapshot: any
  ): Promise<InterfaceAnalysis> {
    // Implement analysis logic based on extracted elements
    // This is a placeholder implementation
    
    return {
      website,
      pageType: 'homepage',
      layout: {
        structure: 'Standard header-content-footer',
        responsiveness: 'Responsive with breakpoints',
        navigationPattern: 'Horizontal top navigation',
        contentHierarchy: ['Header', 'Hero section', 'Features', 'Testimonials', 'Footer'],
        whiteSpaceUsage: 'Balanced with adequate spacing between sections'
      },
      components: [
        {
          name: 'Navigation Menu',
          description: 'Horizontal navigation with dropdown submenus',
          purpose: 'Primary site navigation',
          location: 'Top header',
          interactivity: ['Hover dropdown', 'Mobile hamburger toggle'],
          visualStyle: 'Minimal with hover effects',
          accessibility: 'Partially accessible, missing some ARIA attributes'
        },
        {
          name: 'Call to Action Button',
          description: 'Primary action button',
          purpose: 'Drive conversions',
          location: 'Hero section and throughout page',
          interactivity: ['Hover effect', 'Click animation'],
          visualStyle: 'High contrast with rounded corners',
          accessibility: 'Good contrast ratio and focus states'
        }
      ],
      colorScheme: {
        primary: ['#3366FF', '#1A4CCC'],
        secondary: ['#FF9900', '#CC7A00'],
        accent: ['#FF3366', '#CC1A4C'],
        neutral: ['#F5F5F5', '#E0E0E0', '#9E9E9E', '#424242'],
        semanticColors: {
          success: '#4CAF50',
          error: '#F44336',
          warning: '#FF9800',
          info: '#2196F3'
        },
        contrastRatio: 'Good (4.5:1 or better for most text)'
      },
      typography: {
        headingFont: 'Montserrat, sans-serif',
        bodyFont: 'Open Sans, sans-serif',
        fontPairings: ['Montserrat headings with Open Sans body'],
        sizeHierarchy: ['2.5rem', '2rem', '1.5rem', '1.25rem', '1rem', '0.875rem'],
        readability: 'Good with appropriate line height and spacing',
        responsiveScaling: 'Font sizes scale down on mobile devices'
      },
      interactionPatterns: [
        'Hover effects on interactive elements',
        'Smooth scroll on navigation links',
        'Form validation with inline feedback',
        'Modal dialogs for additional information'
      ],
      strengthsAndWeaknesses: {
        strengths: [
          'Clear visual hierarchy',
          'Consistent design language',
          'Effective use of whitespace',
          'Good mobile responsiveness'
        ],
        weaknesses: [
          'Some contrast issues in secondary content',
          'Navigation becomes cluttered on medium screens',
          'Inconsistent button styles in some sections',
          'Form validation feedback could be improved'
        ]
      }
    };
  }

  /**
   * Create fallback interface analysis when automation fails
   */
  private createFallbackInterfaceAnalysis(website: string): InterfaceAnalysis {
    return {
      website,
      pageType: 'unknown',
      layout: {
        structure: 'Standard layout (fallback)',
        responsiveness: 'Unknown',
        navigationPattern: 'Unknown',
        contentHierarchy: ['Unknown'],
        whiteSpaceUsage: 'Unknown'
      },
      components: [],
      colorScheme: {
        primary: ['Unknown'],
        secondary: ['Unknown'],
        accent: ['Unknown'],
        neutral: ['Unknown'],
        semanticColors: {
          success: 'Unknown',
          error: 'Unknown',
          warning: 'Unknown',
          info: 'Unknown'
        },
        contrastRatio: 'Unknown'
      },
      typography: {
        headingFont: 'Unknown',
        bodyFont: 'Unknown',
        fontPairings: ['Unknown'],
        sizeHierarchy: ['Unknown'],
        readability: 'Unknown',
        responsiveScaling: 'Unknown'
      },
      interactionPatterns: ['Unknown'],
      strengthsAndWeaknesses: {
        strengths: ['Unable to determine (fallback)'],
        weaknesses: ['Unable to determine (fallback)']
      }
    };
  }

  /**
   * Research design patterns
   */
  private async researchDesignPatterns(
    patterns: string[],
    interfaceAnalyses: InterfaceAnalysis[]
  ): Promise<DesignPatternAnalysis[]> {
    // Implement design pattern research logic
    // This is a placeholder implementation
    return patterns.map(pattern => ({
      pattern,
      description: `Common design pattern for improving user experience`,
      useCases: ['E-commerce', 'Content sites', 'Web applications'],
      examples: interfaceAnalyses.slice(0, 2).map(analysis => ({
        website: analysis.website,
        pageUrl: `https://${analysis.website}`,
        description: `Implementation of ${pattern} pattern`
      })),
      effectiveness: 'High when implemented correctly',
      implementation: 'Varies by framework and platform',
      accessibility: 'Requires careful implementation for accessibility'
    }));
  }

  /**
   * Map user flows using Stagehand
   */
  private async mapUserFlows(
    flows: string[],
    context: UIUXResearchContext
  ): Promise<UserFlowMap[]> {
    // Implement user flow mapping logic
    // This is a placeholder implementation
    return flows.map((flow, index) => ({
      name: flow,
      description: `Common user journey for ${flow}`,
      steps: [
        {
          step: 1,
          page: 'Homepage',
          action: 'View landing page',
          userGoal: 'Understand product/service offering',
          interfaceElements: ['Hero section', 'Value proposition', 'CTA button']
        },
        {
          step: 2,
          page: 'Features',
          action: 'Browse features',
          userGoal: 'Learn about capabilities',
          interfaceElements: ['Feature cards', 'Screenshots', 'Benefit statements']
        },
        {
          step: 3,
          page: 'Pricing',
          action: 'Review pricing options',
          userGoal: 'Understand cost and value',
          interfaceElements: ['Pricing table', 'Feature comparison', 'CTA buttons']
        }
      ],
      painPoints: [
        'Navigation to pricing not immediately obvious',
        'Feature descriptions too technical for some users'
      ],
      opportunities: [
        'Simplify navigation path to pricing',
        'Add more visual examples of features in action'
      ]
    }));
  }

  /**
   * Analyze accessibility using Stagehand
   */
  private async analyzeAccessibility(
    interfaceAnalyses: InterfaceAnalysis[]
  ): Promise<AccessibilityReport> {
    // Implement accessibility analysis logic
    // This is a placeholder implementation
    return {
      wcagCompliance: 'Partial WCAG 2.1 AA compliance',
      keyIssues: [
        {
          issue: 'Insufficient color contrast in secondary content',
          impact: 'medium',
          wcagCriteria: '1.4.3 Contrast (Minimum)',
          affectedElements: ['Secondary text', 'Inactive buttons'],
          recommendation: 'Increase contrast ratio to at least 4.5:1 for all text'
        },
        {
          issue: 'Missing alternative text for some images',
          impact: 'high',
          wcagCriteria: '1.1.1 Non-text Content',
          affectedElements: ['Product images', 'Icon buttons'],
          recommendation: 'Add descriptive alt text to all images'
        }
      ],
      bestPractices: [
        'Use semantic HTML elements',
        'Ensure keyboard navigation works for all interactive elements',
        'Provide visible focus indicators',
        'Test with screen readers'
      ],
      overallScore: '72/100'
    };
  }

  /**
   * Create competitive comparison
   */
  private async createCompetitiveComparison(
    competitors: string[],
    interfaceAnalyses: InterfaceAnalysis[]
  ): Promise<CompetitiveUIComparison> {
    // Implement competitive comparison logic
    // This is a placeholder implementation
    
    const strengthsMap: Record<string, string[]> = {};
    const weaknessesMap: Record<string, string[]> = {};
    const innovativeFeatures: Record<string, string[]> = {};
    
    // Extract strengths and weaknesses from analyses
    interfaceAnalyses.forEach(analysis => {
      const website = analysis.website;
      strengthsMap[website] = analysis.strengthsAndWeaknesses.strengths;
      weaknessesMap[website] = analysis.strengthsAndWeaknesses.weaknesses;
      innovativeFeatures[website] = ['Innovative feature 1', 'Innovative feature 2'];
    });
    
    return {
      summary: `Comparative analysis of ${competitors.length} competitors in the industry`,
      comparisonMatrix: [
        {
          feature: 'Navigation',
          competitors: competitors.reduce((acc, competitor) => {
            acc[competitor] = {
              implementation: 'Standard horizontal navigation',
              effectiveness: 'medium',
              notes: 'Clear but conventional'
            };
            return acc;
          }, {} as Record<string, any>)
        },
        {
          feature: 'Call to Action',
          competitors: competitors.reduce((acc, competitor) => {
            acc[competitor] = {
              implementation: 'Prominent buttons with contrasting colors',
              effectiveness: 'high',
              notes: 'Clear and compelling'
            };
            return acc;
          }, {} as Record<string, any>)
        }
      ],
      strengthsMap,
      weaknessesMap,
      innovativeFeatures,
      recommendations: [
        'Adopt the clear navigation structure from Competitor A',
        'Improve call-to-action visibility based on Competitor B approach',
        'Consider implementing the innovative feature from Competitor C'
      ]
    };
  }

  /**
   * Generate best practices
   */
  private async generateBestPractices(
    context: UIUXResearchContext,
    result: UIUXResearchResult
  ): Promise<UIUXBestPractice[]> {
    // Implement best practices generation logic
    // This is a placeholder implementation
    return [
      {
        category: 'Navigation',
        practice: 'Clear and consistent navigation structure',
        rationale: 'Reduces cognitive load and improves findability',
        examples: ['Persistent top navigation', 'Breadcrumb trails', 'Hamburger menu for mobile'],
        implementation: 'Use semantic HTML nav elements with consistent styling across pages'
      },
      {
        category: 'Visual Hierarchy',
        practice: 'Establish clear visual hierarchy',
        rationale: 'Guides users through content in order of importance',
        examples: ['Larger headlines', 'Strategic use of whitespace', 'Color and contrast for emphasis'],
        implementation: 'Use size, weight, color, and spacing to create clear content hierarchy'
      },
      {
        category: 'Accessibility',
        practice: 'Design for keyboard navigation',
        rationale: 'Essential for users with motor disabilities and power users',
        examples: ['Visible focus states', 'Logical tab order', 'Skip navigation links'],
        implementation: 'Ensure all interactive elements are keyboard accessible with visible focus states'
      }
    ];
  }

  /**
   * Add visual asset to result
   */
  private addVisualAsset(
    type: 'screenshot' | 'flowchart' | 'heatmap' | 'wireframe',
    website: string,
    page: string,
    url: string
  ): void {
    // Implementation would add the visual asset to the result
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(request: SynthesisRequest): string {
    return `uiux-${JSON.stringify(request.operation)}-${JSON.stringify(request.context)}`;
  }

  /**
   * Check if cache is valid
   */
  private isCacheValid(cacheKey: string): boolean {
    if (!this.cache.has(cacheKey)) {
      return false;
    }
    
    const expiryTime = this.cacheExpiry.get(cacheKey) || 0;
    return Date.now() < expiryTime;
  }

  /**
   * Cache result with expiry
   */
  private cacheResult(cacheKey: string, result: any, expiryMinutes = 60): void {
    this.cache.set(cacheKey, result);
    this.cacheExpiry.set(cacheKey, Date.now() + (expiryMinutes * 60 * 1000));
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.logger.info('Cleaning up UI/UX Research Agent resources');
    this.cache.clear();
    this.cacheExpiry.clear();
  }
} 