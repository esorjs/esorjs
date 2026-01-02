/**
 * Client - Enhanced SSR API Example
 *
 * This file hydrates the server-rendered content
 */

import { hydrateComponent } from '../../../src/ssr/enhanced-api.js';
import { Counter } from './counter.js';

// Get initial count from URL if present
const path = window.location.pathname;
const match = path.match(/\/counter\/(\d+)/);
const initialCount = match ? parseInt(match[1]) : 0;

// Hydrate the server-rendered counter
// The signals are automatically reconnected!
hydrateComponent('#app', Counter, { initialCount });

console.log('✅ Counter hydrated successfully!');
console.log('🎯 Enhanced SSR API - No manual signal mapping needed!');
