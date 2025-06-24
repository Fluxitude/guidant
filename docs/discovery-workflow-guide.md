# Discovery Workflow User Guide

## Overview

The Guidant Discovery Workflow is an AI-guided system that helps you transform project ideas into comprehensive Product Requirements Documents (PRDs) through structured discovery, research, and requirements synthesis.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Discovery Workflow Steps](#discovery-workflow-steps)
3. [MCP Tools Reference](#mcp-tools-reference)
4. [Quality Assessment](#quality-assessment)
5. [Best Practices](#best-practices)
6. [Troubleshooting](#troubleshooting)

## Getting Started

### Prerequisites

- Guidant installed and configured
- MCP server running with discovery tools enabled
- AI assistant with access to discovery MCP tools

### Quick Start

1. **Start a Discovery Session**
   ```
   Use the start_discovery_session tool with your project name and preferences
   ```

2. **Conduct Research**
   ```
   Use research_market_opportunity and validate_technical_feasibility tools
   ```

3. **Synthesize Requirements**
   ```
   Use synthesize_requirements to create structured requirements
   ```

4. **Generate PRD**
   ```
   Use generate_prd to create your Product Requirements Document
   ```

5. **Assess Quality**
   ```
   Use assess_prd_quality to evaluate and improve your PRD
   ```

## Discovery Workflow Steps

### Step 1: Session Initialization

**Tool**: `start_discovery_session`

**Purpose**: Create a new discovery session with project context and user preferences.

**Required Information**:
- Project name
- Technology stack preferences (optional)
- Business goals (optional)
- Target audience (optional)
- Project constraints (optional)

**Example**:
```json
{
  "projectName": "E-commerce Platform",
  "userPreferences": {
    "techStack": ["React", "Node.js", "PostgreSQL"],
    "businessGoals": ["Increase online sales", "Improve user experience"],
    "targetAudience": "Small to medium businesses",
    "constraints": ["Budget: $50k", "Timeline: 6 months"]
  }
}
```

**Output**: Session ID and initial project structure

### Step 2: Market Research

**Tool**: `research_market_opportunity`

**Purpose**: Conduct market research and competitive analysis using intelligent provider routing.

**Key Features**:
- Automatic provider selection (Tavily for market research)
- Multiple research queries support
- Competitive analysis integration
- Market opportunity assessment

**Example**:
```json
{
  "sessionId": "your-session-id",
  "researchQueries": [
    "E-commerce market trends 2024",
    "Small business online selling challenges",
    "Shopify vs WooCommerce comparison"
  ],
  "targetMarket": "SMB e-commerce",
  "competitors": ["Shopify", "WooCommerce", "BigCommerce"],
  "researchFocus": "market_size"
}
```

### Step 3: Technical Feasibility Validation

**Tool**: `validate_technical_feasibility`

**Purpose**: Validate technical feasibility using Context7 for library documentation and architecture recommendations.

**Key Features**:
- Technology stack validation
- Architecture recommendations
- Scalability considerations
- Risk factor identification

**Example**:
```json
{
  "sessionId": "your-session-id",
  "technologies": ["React", "Node.js", "PostgreSQL"],
  "projectType": "web application",
  "features": ["Real-time updates", "Payment processing", "User management"],
  "scale": "medium",
  "constraints": ["Must support offline mode", "Real-time updates required"]
}
```

### Step 4: Requirements Synthesis

**Tool**: `synthesize_requirements`

**Purpose**: Synthesize discovery findings into structured functional and non-functional requirements.

**Key Features**:
- Structured requirements format
- User story integration
- Priority assignment
- Quality scoring
- PRD readiness assessment

**Example**:
```json
{
  "sessionId": "your-session-id",
  "problemStatement": "Small businesses need an affordable, easy-to-use e-commerce platform",
  "targetUsers": ["Small business owners", "Online retailers"],
  "successCriteria": ["Increase sales by 30%", "Reduce setup time to 1 hour"],
  "functionalRequirements": [
    {
      "id": "FR-001",
      "title": "Product Catalog Management",
      "description": "Users can add, edit, and organize products with images and descriptions",
      "priority": "HIGH",
      "userStory": "As a store owner, I want to manage my product catalog so that customers can browse items"
    }
  ],
  "nonFunctionalRequirements": [
    {
      "id": "NFR-001",
      "category": "Performance",
      "description": "Page load times must be under 3 seconds",
      "priority": "HIGH",
      "acceptanceCriteria": "All pages load within 3 seconds on standard broadband"
    }
  ]
}
```

### Step 5: PRD Generation

**Tool**: `generate_prd`

**Purpose**: Generate a comprehensive Product Requirements Document from discovery session data.

**Key Features**:
- Intelligent template selection
- Content synthesis from discovery data
- Quality assessment integration
- File output management

**Template Types**:
- **COMPREHENSIVE**: Full-featured PRD with all sections (default for most projects)
- **MINIMAL**: Essential sections only (for simple projects)
- **TECHNICAL_FOCUSED**: Emphasis on technical specifications and architecture

**Example**:
```json
{
  "sessionId": "your-session-id",
  "templateType": "COMPREHENSIVE",
  "outputPath": "./docs",
  "includeResearchData": true,
  "aiEnhancement": true
}
```

### Step 6: Quality Assessment

**Tool**: `assess_prd_quality`

**Purpose**: Assess PRD quality with comprehensive scoring, gap analysis, and improvement recommendations.

**Assessment Criteria**:
1. **Completeness (25% weight)**: Content length, essential sections, requirements detail
2. **Clarity (20% weight)**: Structure, headings, actionable language
3. **Technical Feasibility (20% weight)**: Technical specs, architecture, performance considerations
4. **Market Validation (15% weight)**: Market analysis, competitive research, business value
5. **Requirements Coverage (20% weight)**: Functional/non-functional requirements, user stories

**Quality Thresholds**:
- **Excellent**: 90+ points - Ready for immediate development
- **Good**: 75+ points - Ready for development with minor review
- **Acceptable**: 60+ points - Ready for task generation
- **Needs Improvement**: 40+ points - Requires significant work
- **Poor**: <40 points - Major revision needed

**Example**:
```json
{
  "sessionId": "your-session-id",
  "assessmentType": "comprehensive",
  "generateReport": true
}
```

## MCP Tools Reference

### Tool Parameters Summary

| Tool | Required Parameters | Optional Parameters |
|------|-------------------|-------------------|
| `start_discovery_session` | projectName | userPreferences, projectRoot |
| `research_market_opportunity` | sessionId, researchQueries | targetMarket, competitors, researchFocus |
| `validate_technical_feasibility` | sessionId, technologies, projectType | features, scale, constraints |
| `synthesize_requirements` | sessionId, problemStatement, targetUsers, successCriteria, functionalRequirements | nonFunctionalRequirements |
| `generate_prd` | sessionId | templateType, outputPath, includeResearchData, customSections |
| `assess_prd_quality` | sessionId OR prdFilePath OR prdContent | assessmentType, focusAreas, generateReport |

### Error Handling

All tools include comprehensive error handling:
- **Validation Errors**: Invalid parameters or missing required data
- **Session Errors**: Session not found or incomplete
- **Processing Errors**: Internal processing failures
- **File System Errors**: File access or permission issues

Common error responses include specific error codes and actionable messages.

## Quality Assessment

### Readiness Metrics

The quality assessment provides several readiness indicators:

- **Development Readiness**: Quality score ≥ 75
- **Task Generation Readiness**: Quality score ≥ 60
- **Stakeholder Review Readiness**: Quality score ≥ 60
- **Confidence Level**: Based on score consistency and variance

### Improvement Planning

Quality assessment includes:
- **Gap Identification**: Specific areas needing improvement
- **Recommendations**: Actionable improvement suggestions
- **Priority Areas**: Most important areas to focus on
- **Effort Estimation**: Time required for improvements

## Best Practices

### 1. Project Planning
- Start with clear project goals and constraints
- Define target audience early
- Consider technical constraints upfront

### 2. Research Phase
- Use multiple research queries for comprehensive coverage
- Include competitive analysis
- Validate market opportunity

### 3. Requirements Definition
- Write clear, testable requirements
- Include user stories for better clarity
- Define acceptance criteria
- Balance functional and non-functional requirements

### 4. PRD Generation
- Choose appropriate template based on project complexity
- Include research data for comprehensive context
- Review and iterate based on quality assessment

### 5. Quality Improvement
- Address high-priority gaps first
- Focus on completeness and clarity
- Validate technical feasibility thoroughly
- Ensure market validation is comprehensive

## Troubleshooting

### Common Issues

**Session Not Found**
- Verify session ID is correct
- Check if session was properly created
- Ensure session hasn't expired

**Low Quality Scores**
- Add more detailed requirements
- Include user stories and acceptance criteria
- Expand technical specifications
- Add market research data

**Template Selection Issues**
- Verify project type is correctly specified
- Check requirements count
- Consider manual template override

**File Output Problems**
- Verify output path permissions
- Check disk space availability
- Ensure directory exists

### Getting Help

1. Check error messages for specific guidance
2. Review session state and progress
3. Validate input parameters
4. Use quality assessment recommendations
5. Consult this documentation for best practices

## Advanced Usage

### Custom Sections
Add custom sections to PRDs:
```json
{
  "customSections": [
    {
      "title": "Integration Requirements",
      "content": "Custom integration specifications...",
      "order": 8
    }
  ]
}
```

### Focused Quality Assessment
Assess specific quality criteria:
```json
{
  "assessmentType": "focused",
  "focusAreas": ["completeness", "technical-feasibility"]
}
```

### Batch Processing
Process multiple projects by creating separate sessions for each project and following the workflow for each.

---

## Summary

The Discovery Workflow provides a complete solution for transforming project ideas into high-quality PRDs through:

- **AI-Guided Process**: Intelligent routing and recommendations
- **Comprehensive Research**: Market and technical validation
- **Quality Assessment**: Automated scoring and improvement guidance
- **Flexible Templates**: Adaptable to different project types
- **Session Management**: Persistent state and progress tracking

The workflow typically takes 30-60 minutes to complete and produces PRDs ready for development and task generation.

For more information, see the [API Reference](./api-reference.md) and [Examples](./examples.md).
