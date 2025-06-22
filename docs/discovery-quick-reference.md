# Discovery Workflow Quick Reference

## 🚀 Quick Start Checklist

### 1. Start Discovery Session
```
Tool: start_discovery_session
Required: projectName
Optional: userPreferences (techStack, businessGoals, targetAudience, constraints)
```

### 2. Market Research
```
Tool: research_market_opportunity
Required: sessionId, researchQueries
Optional: targetMarket, competitors, researchFocus
```

### 3. Technical Validation
```
Tool: validate_technical_feasibility
Required: sessionId, technologies, projectType
Optional: features, scale, constraints
```

### 4. Synthesize Requirements
```
Tool: synthesize_requirements
Required: sessionId, problemStatement, targetUsers, successCriteria, functionalRequirements
Optional: nonFunctionalRequirements
```

### 5. Generate PRD
```
Tool: generate_prd
Required: sessionId
Optional: templateType, outputPath, includeResearchData
```

### 6. Assess Quality
```
Tool: assess_prd_quality
Required: sessionId OR prdFilePath OR prdContent
Optional: assessmentType, generateReport
```

## 📊 Quality Thresholds

| Score | Level | Status |
|-------|-------|--------|
| 90+ | Excellent | Ready for immediate development |
| 75+ | Good | Ready for development with minor review |
| 60+ | Acceptable | Ready for task generation |
| 40+ | Needs Improvement | Requires significant work |
| <40 | Poor | Major revision needed |

## 🎯 Template Types

| Template | Use Case | Sections |
|----------|----------|----------|
| COMPREHENSIVE | Most projects, complex requirements | 10 sections |
| MINIMAL | Simple projects, prototypes | 3 sections |
| TECHNICAL_FOCUSED | APIs, microservices, libraries | 3 technical sections |

## 🔍 Assessment Criteria

| Criterion | Weight | Focus |
|-----------|--------|-------|
| Completeness | 25% | Content length, sections, requirements detail |
| Clarity | 20% | Structure, headings, actionable language |
| Technical Feasibility | 20% | Tech specs, architecture, performance |
| Market Validation | 15% | Market analysis, competitive research |
| Requirements Coverage | 20% | Functional/non-functional requirements |

## 🛠️ Common Patterns

### Basic E-commerce Project
```json
{
  "projectName": "Online Store",
  "userPreferences": {
    "techStack": ["React", "Node.js", "PostgreSQL"],
    "businessGoals": ["Increase sales", "Improve UX"],
    "targetAudience": "Small businesses"
  }
}
```

### API Service Project
```json
{
  "projectName": "Payment API",
  "userPreferences": {
    "techStack": ["Node.js", "Express", "MongoDB"],
    "businessGoals": ["Secure payments", "High availability"],
    "constraints": ["PCI compliance required"]
  }
}
```

### Mobile App Project
```json
{
  "projectName": "Task Manager App",
  "userPreferences": {
    "techStack": ["React Native", "Firebase"],
    "businessGoals": ["Improve productivity", "Cross-platform"],
    "targetAudience": "Remote teams"
  }
}
```

## 📋 Requirements Template

### Functional Requirement
```json
{
  "id": "FR-001",
  "title": "User Authentication",
  "description": "Users can register, login, and manage their accounts securely",
  "priority": "HIGH",
  "userStory": "As a user, I want to create an account so that I can access personalized features",
  "acceptanceCriteria": ["Email verification required", "Password strength validation"]
}
```

### Non-Functional Requirement
```json
{
  "id": "NFR-001",
  "category": "Performance",
  "description": "System must respond within 2 seconds for all user interactions",
  "priority": "HIGH",
  "acceptanceCriteria": "95% of requests complete within 2 seconds under normal load"
}
```

## 🚨 Common Errors

### Session Not Found
```
Error: Discovery session {sessionId} not found
Solution: Verify session ID or create new session
```

### Incomplete Requirements
```
Error: Requirements synthesis must be completed before PRD generation
Solution: Use synthesize_requirements tool first
```

### Low Quality Score
```
Warning: PRD quality below recommended threshold
Solution: Address gaps and recommendations, add more detail
```

### Missing Technical Data
```
Error: Insufficient discovery data for PRD generation
Solution: Complete market research and technical feasibility validation
```

## 💡 Best Practices

### Research Phase
- Use 3-5 specific research queries
- Include competitor analysis
- Focus on target market validation
- Validate technical assumptions

### Requirements Definition
- Minimum 3-5 functional requirements
- Include 2-3 non-functional requirements
- Write clear user stories
- Define measurable acceptance criteria

### PRD Generation
- Choose appropriate template for project type
- Include research data for context
- Use AI enhancement for better quality
- Save to organized output directory

### Quality Improvement
- Address completeness gaps first
- Improve clarity with better structure
- Validate technical feasibility thoroughly
- Ensure market validation is comprehensive

## 🔄 Workflow Variations

### Minimal Workflow (Simple Projects)
1. start_discovery_session
2. synthesize_requirements (minimal)
3. generate_prd (MINIMAL template)
4. assess_prd_quality

### Research-Heavy Workflow (Complex Projects)
1. start_discovery_session
2. research_market_opportunity (multiple queries)
3. validate_technical_feasibility (comprehensive)
4. synthesize_requirements (detailed)
5. generate_prd (COMPREHENSIVE template)
6. assess_prd_quality
7. Iterate based on recommendations

### Technical-Focused Workflow (APIs/Services)
1. start_discovery_session
2. validate_technical_feasibility (detailed)
3. synthesize_requirements (technical focus)
4. generate_prd (TECHNICAL_FOCUSED template)
5. assess_prd_quality

## 📈 Success Metrics

### Session Completion
- All discovery stages completed
- Requirements synthesis score > 70
- PRD quality score > 60

### PRD Readiness
- Ready for development: Quality score ≥ 75
- Ready for task generation: Quality score ≥ 60
- Confidence level: High consistency across criteria

### Quality Indicators
- Comprehensive requirements coverage
- Clear technical specifications
- Validated market opportunity
- Actionable implementation guidance

## 🔧 Troubleshooting

### Performance Issues
- Reduce research query count
- Use focused assessment mode
- Optimize template selection

### Quality Issues
- Add more detailed requirements
- Include user stories and acceptance criteria
- Expand technical specifications
- Add market research data

### Integration Issues
- Verify MCP server is running
- Check tool registration
- Validate session state persistence
- Review error logs for specific issues

---

**Need Help?** See the [Full User Guide](./discovery-workflow-guide.md) for detailed explanations and examples.
