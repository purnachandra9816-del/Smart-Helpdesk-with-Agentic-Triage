// MongoDB initialization script
// This script runs when the MongoDB container starts for the first time

db = db.getSiblingDB('helpdesk');

// Create collections with proper indexing
db.createCollection('users');
db.createCollection('articles');
db.createCollection('tickets');
db.createCollection('agentsuggestions');
db.createCollection('auditlogs');
db.createCollection('configs');

// Create indexes for optimal performance
print('Creating indexes...');

// User indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });

// Article indexes
db.articles.createIndex({ title: 'text', body: 'text', tags: 'text' });
db.articles.createIndex({ status: 1 });
db.articles.createIndex({ category: 1 });
db.articles.createIndex({ tags: 1 });
db.articles.createIndex({ createdAt: -1 });

// Ticket indexes
db.tickets.createIndex({ status: 1 });
db.tickets.createIndex({ createdBy: 1 });
db.tickets.createIndex({ assignee: 1 });
db.tickets.createIndex({ category: 1 });
db.tickets.createIndex({ priority: 1 });
db.tickets.createIndex({ createdAt: -1 });

// Agent suggestion indexes
db.agentsuggestions.createIndex({ ticketId: 1 });
db.agentsuggestions.createIndex({ confidence: -1 });
db.agentsuggestions.createIndex({ autoClosed: 1 });

// Audit log indexes
db.auditlogs.createIndex({ ticketId: 1, timestamp: -1 });
db.auditlogs.createIndex({ traceId: 1 });
db.auditlogs.createIndex({ action: 1 });

print('MongoDB initialization completed successfully');