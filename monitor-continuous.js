#!/usr/bin/env node

/**
 * Continuous Task Master Monitoring
 * Runs monitoring cycles every 30 seconds and tracks trends
 */

import { TaskMasterMonitor } from './test-realtime-monitor.js';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ContinuousMonitor {
    constructor(intervalSeconds = 30) {
        this.interval = intervalSeconds * 1000;
        this.monitor = new TaskMasterMonitor();
        this.history = [];
        this.isRunning = false;
        this.cycleCount = 0;
    }

    log(message, color = 'reset') {
        const colors = {
            green: '\x1b[32m',
            red: '\x1b[31m',
            yellow: '\x1b[33m',
            blue: '\x1b[34m',
            cyan: '\x1b[36m',
            reset: '\x1b[0m',
            bold: '\x1b[1m'
        };
        const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
        console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
    }

    async runCycle() {
        this.cycleCount++;
        this.log(`🔄 Running monitoring cycle #${this.cycleCount}...`, 'blue');
        
        try {
            const result = await this.monitor.runMonitoringCycle();
            
            // Store result in history
            this.history.push({
                timestamp: new Date().toISOString(),
                cycle: this.cycleCount,
                success: result.success,
                metrics: this.monitor.metrics
            });
            
            // Keep only last 20 cycles
            if (this.history.length > 20) {
                this.history = this.history.slice(-20);
            }
            
            await this.generateTrendReport();
            
            if (result.success) {
                this.log(`✅ Cycle #${this.cycleCount} completed successfully`, 'green');
            } else {
                this.log(`⚠️ Cycle #${this.cycleCount} completed with issues`, 'yellow');
            }
            
        } catch (error) {
            this.log(`❌ Cycle #${this.cycleCount} failed: ${error.message}`, 'red');
        }
    }

    async generateTrendReport() {
        if (this.history.length < 2) return;
        
        const recent = this.history.slice(-5); // Last 5 cycles
        const successRate = (recent.filter(h => h.success).length / recent.length) * 100;
        
        // Calculate trends
        const avgPRDScores = recent
            .map(h => h.metrics.prdQualityScores)
            .filter(scores => scores.length > 0)
            .map(scores => scores.reduce((a, b) => a + b, 0) / scores.length);
        
        const avgSessionTimes = recent
            .map(h => h.metrics.sessionTimes)
            .filter(times => times.length > 0)
            .map(times => times.reduce((a, b) => a + b, 0) / times.length);
        
        const totalCosts = recent
            .map(h => h.metrics.researchCosts.reduce((a, b) => a + b, 0));
        
        const trendReport = `
# Task Master Continuous Monitoring Report
Generated: ${new Date().toISOString()}
Monitoring Cycles: ${this.cycleCount}
History Window: ${this.history.length} cycles

## 📊 Recent Performance (Last 5 Cycles)
- Success Rate: ${Math.round(successRate)}%
- Average PRD Quality: ${avgPRDScores.length > 0 ? Math.round(avgPRDScores.reduce((a, b) => a + b, 0) / avgPRDScores.length) : 'N/A'}/100
- Average Session Time: ${avgSessionTimes.length > 0 ? Math.round(avgSessionTimes.reduce((a, b) => a + b, 0) / avgSessionTimes.length) : 'N/A'}ms
- Total Research Cost: $${totalCosts.reduce((a, b) => a + b, 0).toFixed(4)}

## 📈 Trends
${this.analyzeTrends(avgPRDScores, 'PRD Quality')}
${this.analyzeTrends(avgSessionTimes, 'Session Time')}
${this.analyzeTrends(totalCosts, 'Research Cost')}

## 🎯 Status Indicators
${successRate >= 80 ? '🟢' : successRate >= 60 ? '🟡' : '🔴'} Overall Health: ${successRate >= 80 ? 'HEALTHY' : successRate >= 60 ? 'WARNING' : 'CRITICAL'}
${avgPRDScores.length > 0 && avgPRDScores[avgPRDScores.length - 1] >= 75 ? '🟢' : '🟡'} PRD Quality: ${avgPRDScores.length > 0 && avgPRDScores[avgPRDScores.length - 1] >= 75 ? 'GOOD' : 'NEEDS IMPROVEMENT'}
${avgSessionTimes.length > 0 && avgSessionTimes[avgSessionTimes.length - 1] < 10000 ? '🟢' : '🟡'} Performance: ${avgSessionTimes.length > 0 && avgSessionTimes[avgSessionTimes.length - 1] < 10000 ? 'FAST' : 'SLOW'}

## 📋 Recent Cycles
${recent.map(h => `- Cycle #${h.cycle} (${h.timestamp.split('T')[1].split('.')[0]}): ${h.success ? '✅' : '❌'}`).join('\n')}
        `;
        
        await fs.writeFile(path.join(__dirname, 'continuous-monitoring-report.md'), trendReport);
    }

    analyzeTrends(values, metric) {
        if (values.length < 2) return `${metric}: Insufficient data`;
        
        const first = values[0];
        const last = values[values.length - 1];
        const change = ((last - first) / first) * 100;
        
        let trend = '→';
        let status = 'STABLE';
        
        if (Math.abs(change) > 10) {
            if (change > 0) {
                trend = '↗️';
                status = metric === 'Research Cost' ? 'INCREASING' : 'IMPROVING';
            } else {
                trend = '↘️';
                status = metric === 'Research Cost' ? 'DECREASING' : 'DECLINING';
            }
        }
        
        return `${trend} ${metric}: ${status} (${change > 0 ? '+' : ''}${Math.round(change)}%)`;
    }

    async start() {
        if (this.isRunning) {
            this.log('⚠️ Monitor is already running', 'yellow');
            return;
        }
        
        this.isRunning = true;
        this.log(`🚀 Starting continuous monitoring (${this.interval/1000}s intervals)...`, 'bold');
        
        // Run initial cycle
        await this.runCycle();
        
        // Set up interval
        const intervalId = setInterval(async () => {
            if (!this.isRunning) {
                clearInterval(intervalId);
                return;
            }
            await this.runCycle();
        }, this.interval);
        
        // Handle graceful shutdown
        process.on('SIGINT', () => {
            this.log('\n🛑 Shutting down continuous monitoring...', 'yellow');
            this.isRunning = false;
            clearInterval(intervalId);
            process.exit(0);
        });
        
        this.log('✅ Continuous monitoring started. Press Ctrl+C to stop.', 'green');
    }

    stop() {
        this.isRunning = false;
        this.log('🛑 Continuous monitoring stopped', 'yellow');
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const intervalSeconds = process.argv[2] ? parseInt(process.argv[2]) : 30;
    const monitor = new ContinuousMonitor(intervalSeconds);
    
    monitor.start().catch(error => {
        console.error('💥 Continuous monitoring failed:', error);
        process.exit(1);
    });
}

export { ContinuousMonitor };
