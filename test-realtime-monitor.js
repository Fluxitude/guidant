#!/usr/bin/env node

/**
 * Real-Time Task Master Monitoring Script
 * Tests and monitors Task Master performance in real-time
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for console output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

class TaskMasterMonitor {
    constructor() {
        this.metrics = {
            discoverySessionsCompleted: 0,
            prdQualityScores: [],
            technicalValidationSuccess: 0,
            technicalValidationTotal: 0,
            researchCosts: [],
            sessionTimes: [],
            errors: []
        };
        this.startTime = Date.now();
    }

    log(message, color = 'reset') {
        const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
        console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
    }

    async testDiscoverySession() {
        this.log('🔍 Testing Discovery Session...', 'blue');
        
        try {
            // Import discovery session manager
            const { DiscoverySessionManager } = await import('./mcp-server/src/core/discovery/discovery-session-manager.js');
            const sessionManager = new DiscoverySessionManager();
            
            const sessionStart = Date.now();
            
            // Create test session
            const session = await sessionManager.createSession('Real-Time Test Project', {
                projectType: 'web-application',
                targetAudience: 'developers',
                timeline: '2-weeks'
            });
            
            this.log(`✅ Discovery session created: ${session.session.sessionId}`, 'green');
            
            // Test session progress tracking
            const progress = sessionManager.getProgressSummary(session.session);
            this.log(`📊 Session progress: ${progress.overallProgress}% (${progress.completedStages}/${progress.totalStages} stages)`, 'cyan');
            
            const sessionTime = Date.now() - sessionStart;
            this.metrics.sessionTimes.push(sessionTime);
            this.metrics.discoverySessionsCompleted++;
            
            return { success: true, sessionId: session.session.sessionId, time: sessionTime };
            
        } catch (error) {
            this.log(`❌ Discovery session test failed: ${error.message}`, 'red');
            this.metrics.errors.push({ type: 'discovery_session', error: error.message });
            return { success: false, error: error.message };
        }
    }

    async testPRDQuality() {
        this.log('📋 Testing PRD Quality Assessment...', 'blue');
        
        try {
            // Import quality assessor
            const { QualityAssessor } = await import('./mcp-server/src/core/discovery/quality-assessor.js');
            const assessor = new QualityAssessor();
            
            // Test PRD content
            const testPRD = `
# Test Project PRD
## Overview
This is a test project for real-time monitoring.
## Requirements
- User authentication
- Data storage
- API endpoints
## Technical Specifications
- React frontend
- Node.js backend
- PostgreSQL database
            `;
            
            const mockSession = {
                projectName: 'Test Project',
                stage: 'requirements_synthesis',
                progress: {}
            };
            
            const assessment = await assessor.assessPRDQuality(testPRD, mockSession);
            
            this.log(`📊 PRD Quality Score: ${assessment.overallScore}/100 (${assessment.qualityLevel})`, 'cyan');
            this.log(`   - Completeness: ${assessment.criteriaScores.completeness}/100`, 'cyan');
            this.log(`   - Clarity: ${assessment.criteriaScores.clarity}/100`, 'cyan');
            this.log(`   - Technical Feasibility: ${assessment.criteriaScores['technical-feasibility']}/100`, 'cyan');
            
            this.metrics.prdQualityScores.push(assessment.overallScore);
            
            return { success: true, score: assessment.overallScore };
            
        } catch (error) {
            this.log(`❌ PRD quality test failed: ${error.message}`, 'red');
            this.metrics.errors.push({ type: 'prd_quality', error: error.message });
            return { success: false, error: error.message };
        }
    }

    async testResearchIntegration() {
        this.log('🔬 Testing Research Integration...', 'blue');
        
        try {
            // Import research router
            const { ResearchRouter } = await import('./mcp-server/src/core/research/research-router.js');
            const router = new ResearchRouter();
            
            const testQuery = 'React hooks best practices';
            const context = { projectType: 'web-application' };
            
            const researchStart = Date.now();
            const result = await router.routeQuery(testQuery, context);
            const researchTime = Date.now() - researchStart;
            
            this.log(`✅ Research completed via ${result.provider} in ${researchTime}ms`, 'green');
            this.log(`   Query Type: ${result.queryType}`, 'cyan');
            
            // Estimate cost (mock calculation)
            const estimatedCost = result.provider === 'tavily' ? 0.008 : 0.20;
            this.metrics.researchCosts.push(estimatedCost);
            
            return { success: true, provider: result.provider, time: researchTime, cost: estimatedCost };
            
        } catch (error) {
            this.log(`❌ Research integration test failed: ${error.message}`, 'red');
            this.metrics.errors.push({ type: 'research_integration', error: error.message });
            return { success: false, error: error.message };
        }
    }

    async generateDashboard() {
        const runtime = Date.now() - this.startTime;
        const avgSessionTime = this.metrics.sessionTimes.length > 0 
            ? this.metrics.sessionTimes.reduce((a, b) => a + b, 0) / this.metrics.sessionTimes.length 
            : 0;
        const avgPRDScore = this.metrics.prdQualityScores.length > 0
            ? this.metrics.prdQualityScores.reduce((a, b) => a + b, 0) / this.metrics.prdQualityScores.length
            : 0;
        const totalResearchCost = this.metrics.researchCosts.reduce((a, b) => a + b, 0);
        
        const dashboard = `
# Task Master Real-Time Monitoring Dashboard
Generated: ${new Date().toISOString()}
Runtime: ${Math.round(runtime / 1000)}s

## 🎯 Success Metrics
- ✅ Discovery Sessions Completed: ${this.metrics.discoverySessionsCompleted}
- 📊 Average PRD Quality Score: ${Math.round(avgPRDScore)}/100
- ⏱️  Average Session Time: ${Math.round(avgSessionTime)}ms
- 💰 Total Research Cost: $${totalResearchCost.toFixed(4)}

## 🔍 Technical Validation
- Success Rate: ${this.metrics.technicalValidationTotal > 0 
    ? Math.round((this.metrics.technicalValidationSuccess / this.metrics.technicalValidationTotal) * 100) 
    : 0}%
- Successful Validations: ${this.metrics.technicalValidationSuccess}
- Total Attempts: ${this.metrics.technicalValidationTotal}

## ⚠️ Issues Detected
${this.metrics.errors.length === 0 ? '- No issues detected ✅' : 
  this.metrics.errors.map(e => `- ${e.type}: ${e.error}`).join('\n')}

## 📈 Performance Indicators
${avgSessionTime < 10000 ? '✅' : '⚠️'} Session Time: ${avgSessionTime < 10000 ? 'GOOD' : 'NEEDS IMPROVEMENT'} (target: <10s)
${avgPRDScore >= 75 ? '✅' : '⚠️'} PRD Quality: ${avgPRDScore >= 75 ? 'GOOD' : 'NEEDS IMPROVEMENT'} (target: ≥75)
${totalResearchCost < 0.05 ? '✅' : '⚠️'} Research Cost: ${totalResearchCost < 0.05 ? 'GOOD' : 'HIGH'} (target: <$0.05)
        `;
        
        // Save dashboard to file
        await fs.writeFile(path.join(__dirname, 'realtime-dashboard.md'), dashboard);
        
        return dashboard;
    }

    async runMonitoringCycle() {
        this.log('🚀 Starting Task Master Real-Time Monitoring...', 'bold');
        
        // Run tests
        const discoveryResult = await this.testDiscoverySession();
        const prdResult = await this.testPRDQuality();
        const researchResult = await this.testResearchIntegration();
        
        // Generate dashboard
        const dashboard = await this.generateDashboard();
        
        this.log('\n📊 REAL-TIME DASHBOARD:', 'bold');
        console.log(dashboard);
        
        // Return summary
        return {
            success: discoveryResult.success && prdResult.success && researchResult.success,
            results: { discoveryResult, prdResult, researchResult },
            dashboard
        };
    }
}

// Run monitoring if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const monitor = new TaskMasterMonitor();
    
    monitor.runMonitoringCycle()
        .then(result => {
            if (result.success) {
                monitor.log('🎉 All systems operational!', 'green');
                process.exit(0);
            } else {
                monitor.log('⚠️ Some issues detected. Check dashboard for details.', 'yellow');
                process.exit(1);
            }
        })
        .catch(error => {
            monitor.log(`💥 Monitoring failed: ${error.message}`, 'red');
            process.exit(1);
        });
}

export { TaskMasterMonitor };
