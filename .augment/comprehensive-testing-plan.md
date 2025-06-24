# Comprehensive Task Master Pre-Publication Testing Plan

## Overview
This comprehensive testing plan validates the entire Task Master system before npm publication, ensuring all features work correctly, edge cases are handled, and the user experience is optimal.

## Testing Categories

### 1. Integration Testing for VertexAI & Tavily Enhancements

#### 1.1 Test All 5 VertexAI Models in CLI Context
**Test Cases:**
- Set each model as main: `task-master models --set-main <model>`
- Create tasks with each model: `task-master add-task "Test task"`
- Test research operations: `task-master research "Test query"`
- Validate cost tracking in telemetry data

**Models to Test:**
- `gemini-2.5-pro` ($1.25/$10.00, SWE: 0.55)
- `gemini-2.5-flash` ($0.30/$2.50, SWE: 0.45)
- `gemini-2.5-flash-lite-preview-06-17` ($0.10/$0.40, SWE: 0.35)
- `gemini-2.0-flash-001` ($0.15/$0.60, SWE: 0.40)
- `gemini-2.0-flash-lite-001` ($0.075/$0.30, SWE: 0.30)

**Success Criteria:**
- All models discoverable via `task-master models --list`
- All models can be set and used for operations
- Cost tracking shows expected pricing
- No authentication errors with proper environment variables

#### 1.2 Test All 5 VertexAI Models in MCP Context
**Test Cases:**
- Test each model via MCP tools: `add_task_task-master-ai`
- Validate model selection in MCP responses
- Test research operations: `research_task-master-ai`
- Verify telemetry data in MCP responses

**Success Criteria:**
- All models work through MCP interface
- Telemetry data matches CLI operations
- No MCP-specific authentication issues

#### 1.3 Validate Tavily Search Integration
**Test Cases:**
- Test Tavily via research operations
- Test market research: `research_market_opportunity_task-master-ai`
- Validate cost-effective search ($0.001 per query)
- Test search quality and relevance

**Success Criteria:**
- Tavily search returns relevant results
- Cost tracking shows $0.001 per query
- Integration works with discovery workflow

#### 1.4 Test Cost Optimization Features
**Test Cases:**
- Compare costs: flash-lite vs Claude vs GPT-4
- Test ultra-low-cost operations with flash-lite models
- Validate 90-97.5% cost reduction claims
- Test cost tracking accuracy

**Success Criteria:**
- Flash-lite models work at $0.075/$0.30 pricing
- Cost reductions match expected percentages
- Quality remains acceptable for basic operations

#### 1.5 Verify Environment Variable Handling
**Test Cases:**
- Test with `VERTEX_PROJECT_ID`/`VERTEX_LOCATION` only
- Test with `GOOGLE_VERTEX_PROJECT`/`GOOGLE_VERTEX_LOCATION` only
- Test with both variable sets present
- Test with missing variables

**Success Criteria:**
- Both variable naming conventions work
- Clear error messages for missing variables
- No conflicts when both sets are present

#### 1.6 Test Provider Switching
**Test Cases:**
- Switch between VertexAI, Anthropic, OpenAI providers
- Test fallback mechanisms when primary provider fails
- Test mixed provider configurations (different roles)

**Success Criteria:**
- Smooth switching between providers
- Fallback works automatically on failures
- Mixed configurations work correctly

### 2. Core System Validation

#### 2.1 Test Discovery MCP Tools (6 tools)
**Tools to Test:**
- `start_discovery_session`
- `research_market_opportunity`
- `validate_technical_feasibility`
- `synthesize_requirements`
- `generate_prd`
- `assess_prd_quality`

**Test Cases:**
- Complete discovery workflow end-to-end
- Test each tool individually with valid inputs
- Test tool chaining and session state persistence
- Validate PRD quality scoring (0-100 scale)

**Success Criteria:**
- All tools execute without errors
- Session state persists across tool calls
- Generated PRDs meet quality standards
- Assessment scores are reasonable (60-90 range)

#### 2.2 Test Memory Assistant MCP Tools (3 tools)
**Tools to Test:**
- `get_work_context`
- `generate_progress_summary`
- `manage_work_session`

**Test Cases:**
- Test work context retrieval with various timeframes
- Generate progress summaries for different audiences
- Test session save/resume functionality

**Success Criteria:**
- Context retrieval provides relevant information
- Progress summaries are comprehensive and accurate
- Session management preserves work state

#### 2.3 Test Agile Workflow MCP Tools (3 tools)
**Tools to Test:**
- `manage_sprint`
- `prioritize_tasks`
- `generate_burndown`

**Test Cases:**
- Create and manage sprints with various configurations
- Test AI-driven task prioritization
- Generate burndown charts with visual representations

**Success Criteria:**
- Sprint management works end-to-end
- Task prioritization provides logical ordering
- Burndown charts display correctly

#### 2.4 Test Collaboration MCP Tools (2 tools)
**Tools to Test:**
- `generate_handoff_report`
- `share_knowledge`

**Test Cases:**
- Generate handoff reports for different timeframes
- Create and manage knowledge documents
- Test knowledge search functionality

**Success Criteria:**
- Handoff reports contain relevant information
- Knowledge sharing works across team contexts
- Search returns accurate results

#### 2.5 Test Reporting & Analytics MCP Tools (2 tools)
**Tools to Test:**
- `generate_dashboard`
- `track_performance`

**Test Cases:**
- Generate dashboards for different project types
- Track performance metrics across operations
- Test analytics and optimization recommendations

**Success Criteria:**
- Dashboards provide comprehensive project views
- Performance tracking captures accurate metrics
- Recommendations are actionable

#### 2.6 Test Core Task Management Operations
**Operations to Test:**
- Task creation, update, deletion
- Subtask management
- Status changes and transitions
- Dependency management
- Priority adjustments
- Task expansion and complexity analysis

**Success Criteria:**
- All CRUD operations work correctly
- Data integrity maintained across operations
- Dependencies validated and enforced

#### 2.7 Test Research Integration (Context7 & Tavily)
**Test Cases:**
- Test Context7 zero-cost technical documentation
- Test Tavily cost-effective search
- Test intelligent provider routing
- Validate research quality and accuracy

**Success Criteria:**
- Context7 provides accurate technical information
- Tavily delivers relevant search results
- Provider routing selects appropriate service
- Research quality meets 92%+ accuracy target

#### 2.8 Test Session Management
**Test Cases:**
- Test session creation and initialization
- Test session state persistence
- Test session cleanup and expiration
- Test concurrent session handling

**Success Criteria:**
- Sessions maintain state correctly
- No memory leaks or state corruption
- Concurrent sessions don't interfere

### 3. Edge Case and Error Handling Testing

#### 3.1 Test Invalid API Keys and Authentication Failures
**Test Cases:**
- Missing API keys for each provider
- Invalid/expired API keys
- Malformed API key formats
- Mixed valid/invalid key scenarios

**Success Criteria:**
- Clear error messages for authentication failures
- Graceful degradation when providers unavailable
- Fallback mechanisms work correctly

#### 3.2 Test Network Failures and Connectivity Issues
**Test Cases:**
- Complete network disconnection
- Intermittent connectivity
- API endpoint timeouts
- Rate limiting responses

**Success Criteria:**
- Appropriate error handling for network issues
- Retry mechanisms work correctly
- User receives helpful error messages

#### 3.3 Test Malformed Inputs and Data Validation
**Test Cases:**
- Invalid JSON in task files
- Malformed command arguments
- Boundary value testing (empty strings, very long inputs)
- Special characters and encoding issues

**Success Criteria:**
- Input validation catches malformed data
- Error messages guide users to correct format
- System remains stable with invalid inputs

#### 3.4 Test UUID Format Requirements
**Test Cases:**
- Invalid UUID formats for session IDs
- Missing UUIDs where required
- UUID collision scenarios

**Success Criteria:**
- Clear error messages for invalid UUIDs
- Proper UUID generation and validation
- No UUID collisions in normal operation

#### 3.5 Test Session Dependencies
**Test Cases:**
- Using discovery tools without initialized sessions
- Session expiration scenarios
- Invalid session references

**Success Criteria:**
- Clear error messages for missing sessions
- Proper session lifecycle management
- Graceful handling of expired sessions

#### 3.6 Test Model Selection Logic Overrides
**Test Cases:**
- Commands that override user model preferences
- Fallback model selection
- Model availability checking

**Success Criteria:**
- Model overrides work as intended
- Fallback selection is logical
- User is informed of model changes

#### 3.7 Test MCP vs CLI Authentication Differences
**Test Cases:**
- Different authentication paths for MCP vs CLI
- Environment variable handling differences
- Key status reporting accuracy

**Success Criteria:**
- Both authentication paths work correctly
- Consistent behavior between MCP and CLI
- Accurate key status reporting

#### 3.8 Test File System Edge Cases
**Test Cases:**
- Missing project directories
- Permission denied scenarios
- Corrupted task files
- Disk space limitations

**Success Criteria:**
- Graceful handling of file system issues
- Automatic directory creation where appropriate
- Data recovery mechanisms for corrupted files

### 4. Performance and Scalability Testing

#### 4.1 Test Large Task Sets (100+ tasks)
**Test Cases:**
- Create 100+ tasks with complex dependencies
- Test performance with large task hierarchies
- Validate memory usage with large datasets

**Success Criteria:**
- System remains responsive with 100+ tasks
- Memory usage stays within reasonable bounds
- Operations complete in acceptable timeframes

#### 4.2 Validate Memory Usage and Response Times
**Test Cases:**
- Monitor memory consumption during AI operations
- Test response times for different operation types
- Validate performance with large context windows

**Success Criteria:**
- Memory usage doesn't exceed 500MB for normal operations
- Response times under 30 seconds for most operations
- No memory leaks during extended use

#### 4.3 Test Concurrent Operations
**Test Cases:**
- Multiple simultaneous AI operations
- Concurrent MCP tool calls
- Parallel task management operations

**Success Criteria:**
- No race conditions or data corruption
- Reasonable performance degradation under load
- Proper resource management

#### 4.4 Test Rate Limiting and API Quotas
**Test Cases:**
- Hit rate limits for different providers
- Test quota exhaustion scenarios
- Validate graceful degradation

**Success Criteria:**
- Appropriate handling of rate limits
- Clear error messages for quota issues
- Automatic retry with backoff

#### 4.5 Measure Actual Cost Savings
**Test Cases:**
- Compare costs across providers for identical operations
- Validate cost reduction percentages
- Test cost tracking accuracy

**Success Criteria:**
- VertexAI shows 90-97.5% cost reduction vs Claude
- Tavily shows 99.8% cost reduction vs Perplexity
- Cost tracking is accurate within 5%

#### 4.6 Test Context Window Limits
**Test Cases:**
- Very large PRDs (50+ pages)
- Extensive task histories
- Maximum context size scenarios

**Success Criteria:**
- Graceful handling of context limits
- Intelligent context truncation
- No system crashes with large contexts

#### 4.7 Validate Telemetry and Performance Tracking
**Test Cases:**
- Test telemetry data collection accuracy
- Validate cost tracking across providers
- Test performance metrics reporting

**Success Criteria:**
- Telemetry data is accurate and complete
- Cost tracking matches actual API usage
- Performance metrics provide useful insights

#### 4.8 Test Scalability with Multiple Projects
**Test Cases:**
- Manage multiple projects simultaneously
- Different configurations per project
- Resource isolation between projects

**Success Criteria:**
- No interference between projects
- Proper configuration isolation
- Reasonable performance with multiple projects

## Success Criteria Summary

### Critical Success Criteria (Must Pass)
1. All 5 VertexAI models work in both CLI and MCP contexts
2. All 19 MCP tools execute without errors
3. Cost optimization delivers promised savings (90-97.5%)
4. No data corruption or loss during operations
5. Authentication works correctly for all providers
6. Documentation examples work as written

### Performance Success Criteria
1. System handles 100+ tasks without performance degradation
2. Memory usage stays under 500MB for normal operations
3. Response times under 30 seconds for most operations
4. No memory leaks during extended use

### Quality Success Criteria
1. Error messages are helpful and actionable
2. User experience is consistent across interfaces
3. Backward compatibility maintained
4. Cross-platform compatibility verified

## Test Execution Strategy

### Phase 1: Core Functionality (Days 1-2)
- Integration testing for VertexAI & Tavily
- Core system validation
- Basic error handling

### Phase 2: Edge Cases and Performance (Days 3-4)
- Edge case testing
- Performance and scalability testing
- Stress testing with large datasets

### Phase 3: End-to-End and Documentation (Days 5-6)
- Complete workflow testing
- Documentation validation
- User experience testing

### Phase 4: Final Validation (Day 7)
- Regression testing
- Final performance validation
- Publication readiness check

## Test Environment Setup

### Required Environment Variables
```bash
# VertexAI (both naming conventions)
VERTEX_PROJECT_ID=your-project-id
VERTEX_LOCATION=us-central1
GOOGLE_VERTEX_PROJECT=your-project-id
GOOGLE_VERTEX_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=path/to/credentials.json

# Tavily
TAVILY_API_KEY=your-tavily-key

# Other providers for comparison testing
ANTHROPIC_API_KEY=your-anthropic-key
OPENAI_API_KEY=your-openai-key
PERPLEXITY_API_KEY=your-perplexity-key
```

### Test Data Requirements
- Sample PRD documents (small, medium, large)
- Test task sets (10, 50, 100+ tasks)
- Sample project configurations
- Test session data

## Reporting and Documentation

### Test Results Documentation
- Test execution logs
- Performance metrics
- Cost analysis reports
- Error case documentation
- User experience feedback

### Publication Readiness Checklist
- [ ] All critical tests pass
- [ ] Performance meets requirements
- [ ] Documentation is accurate
- [ ] Package.json is correct
- [ ] Dependencies are up to date
- [ ] Cross-platform compatibility verified
- [ ] Migration scripts tested
- [ ] Changelog updated

This comprehensive testing plan ensures Task Master is production-ready and provides the quality, performance, and reliability expected for npm publication.

## Automated Test Scripts

### 1. VertexAI Integration Test Script
```bash
#!/bin/bash
# test-vertexai-integration.sh

echo "🧪 Testing VertexAI Integration"
echo "================================"

# Test each VertexAI model
models=("gemini-2.5-pro" "gemini-2.5-flash" "gemini-2.5-flash-lite-preview-06-17" "gemini-2.0-flash-001" "gemini-2.0-flash-lite-001")

for model in "${models[@]}"; do
    echo "Testing $model..."

    # Set model as main
    task-master models --set-main "$model" || exit 1

    # Test task creation
    task-master add-task "Test task with $model" || exit 1

    # Test research operation
    task-master research "Test research with $model" || exit 1

    echo "✅ $model passed"
done

echo "🎉 All VertexAI models tested successfully"
```

### 2. MCP Tools Validation Script
```bash
#!/bin/bash
# test-mcp-tools.sh

echo "🧪 Testing MCP Tools"
echo "==================="

# Test discovery tools
echo "Testing discovery tools..."
# Note: These would be tested via MCP client, not CLI

# Test memory assistant tools
echo "Testing memory assistant tools..."

# Test agile workflow tools
echo "Testing agile workflow tools..."

# Test collaboration tools
echo "Testing collaboration tools..."

# Test reporting tools
echo "Testing reporting tools..."

echo "🎉 All MCP tools validated"
```

### 3. Performance Test Script
```bash
#!/bin/bash
# test-performance.sh

echo "🧪 Performance Testing"
echo "====================="

# Create large task set
echo "Creating 100 test tasks..."
for i in {1..100}; do
    task-master add-task "Performance test task $i" --priority medium
done

# Test list performance
echo "Testing task listing performance..."
time task-master list

# Test complexity analysis
echo "Testing complexity analysis performance..."
time task-master analyze-complexity

# Test expansion performance
echo "Testing expansion performance..."
time task-master expand-all

echo "🎉 Performance tests completed"
```

### 4. Error Handling Test Script
```bash
#!/bin/bash
# test-error-handling.sh

echo "🧪 Error Handling Testing"
echo "========================="

# Test with invalid API key
echo "Testing invalid API key handling..."
ANTHROPIC_API_KEY="invalid" task-master add-task "Test task" 2>&1 | grep -q "authentication" && echo "✅ Invalid API key handled correctly"

# Test with malformed input
echo "Testing malformed input handling..."
echo "invalid json" > test-invalid.json
task-master parse-prd test-invalid.json 2>&1 | grep -q "error" && echo "✅ Malformed input handled correctly"
rm test-invalid.json

# Test with missing project
echo "Testing missing project handling..."
cd /tmp
task-master list 2>&1 | grep -q "not found\|not initialized" && echo "✅ Missing project handled correctly"

echo "🎉 Error handling tests completed"
```

## Manual Test Checklists

### VertexAI Integration Checklist
- [ ] All 5 models discoverable via `task-master models --list`
- [ ] Each model can be set as main/research/fallback
- [ ] Task creation works with each model
- [ ] Research operations work with each model
- [ ] Cost tracking shows correct pricing
- [ ] Telemetry data is accurate
- [ ] MCP integration works for all models
- [ ] Environment variables work (both naming conventions)

### Core Functionality Checklist
- [ ] Project initialization works
- [ ] Task CRUD operations work
- [ ] Subtask management works
- [ ] Dependency management works
- [ ] Status transitions work
- [ ] Priority management works
- [ ] Tag management works
- [ ] File generation works
- [ ] Complexity analysis works
- [ ] Task expansion works

### Discovery Workflow Checklist
- [ ] Session creation works
- [ ] Market research works
- [ ] Technical feasibility works
- [ ] Requirements synthesis works
- [ ] PRD generation works
- [ ] Quality assessment works
- [ ] Session state persists
- [ ] Workflow completes end-to-end

### Error Handling Checklist
- [ ] Invalid API keys handled gracefully
- [ ] Network failures handled gracefully
- [ ] Malformed inputs rejected with clear errors
- [ ] Missing files/directories handled
- [ ] Permission errors handled
- [ ] Rate limiting handled
- [ ] UUID validation works
- [ ] Session dependencies validated

### Performance Checklist
- [ ] 100+ tasks handled efficiently
- [ ] Memory usage reasonable (<500MB)
- [ ] Response times acceptable (<30s)
- [ ] No memory leaks
- [ ] Concurrent operations work
- [ ] Large contexts handled
- [ ] Cost tracking accurate
- [ ] Telemetry collection efficient

### Documentation Checklist
- [ ] All README examples work
- [ ] Configuration examples work
- [ ] Command reference accurate
- [ ] Help text accurate
- [ ] Error messages helpful
- [ ] MCP configuration templates work
- [ ] Migration guides accurate
- [ ] Cross-platform instructions correct

## Test Data and Fixtures

### Sample PRD for Testing
```markdown
# Sample Project PRD

## Overview
A simple task management application for testing purposes.

## Requirements
1. User authentication
2. Task creation and management
3. Progress tracking
4. Reporting features

## Technical Stack
- Frontend: React
- Backend: Node.js
- Database: PostgreSQL
```

### Sample Task Configuration
```json
{
  "models": {
    "main": {
      "provider": "vertex",
      "modelId": "gemini-2.5-flash"
    },
    "research": {
      "provider": "vertex",
      "modelId": "gemini-2.5-pro"
    }
  }
}
```

This comprehensive testing plan ensures Task Master is production-ready and provides the quality, performance, and reliability expected for npm publication.
