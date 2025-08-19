import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Article from '../models/Article.js';
import Ticket from '../models/Ticket.js';
import Config from '../models/Config.js';

dotenv.config();

const seedData = {
  users: [
    {
      name: 'Admin User',
      email: 'admin@helpdesk.com',
      password: 'admin123',
      role: 'admin'
    },
    {
      name: 'Support Agent',
      email: 'agent@helpdesk.com',
      password: 'agent123',
      role: 'agent'
    },
    {
      name: 'John Customer',
      email: 'john@customer.com',
      password: 'customer123',
      role: 'user'
    },
    {
      name: 'Jane Customer',
      email: 'jane@customer.com',
      password: 'customer123',
      role: 'user'
    }
  ],

  articles: [
    {
      title: 'How to update your payment method',
      body: `To update your payment method, please follow these steps:

1. Log into your account dashboard
2. Navigate to the "Billing" section
3. Click on "Payment Methods"
4. Add a new payment method or edit existing ones
5. Set your preferred payment method as default

If you're having trouble accessing your billing information, please ensure:
- Your account is in good standing
- You have the necessary permissions
- Your browser cookies are enabled

For additional security, we may ask you to verify your identity when making payment changes.

If you continue to experience issues, please contact our support team with your account details.`,
      tags: ['billing', 'payments', 'account'],
      category: 'billing',
      status: 'published'
    },
    {
      title: 'Troubleshooting 500 Internal Server Errors',
      body: `A 500 Internal Server Error indicates an issue with our servers. Here's what you can do:

**Immediate Steps:**
1. Refresh the page and try again
2. Clear your browser cache and cookies
3. Try using a different browser or incognito mode
4. Check if other users are experiencing similar issues

**If the error persists:**
- Take a screenshot of the error message
- Note the exact time the error occurred
- Record what action you were trying to perform
- Check your browser's developer console for additional error details

**Common Causes:**
- Temporary server overload
- Database connectivity issues
- Recent system updates or maintenance
- Browser compatibility issues

Our technical team is automatically notified of 500 errors and works quickly to resolve them. Most issues are resolved within 30 minutes.

If you need immediate assistance, please contact support with the error details.`,
      tags: ['technical', 'errors', 'troubleshooting', 'server'],
      category: 'tech',
      status: 'published'
    },
    {
      title: 'Tracking your shipment and delivery information',
      body: `You can track your shipment using several methods:

**Order Confirmation Email:**
Your order confirmation email contains a tracking link and number. Click the link or use the tracking number on the carrier's website.

**Account Dashboard:**
1. Log into your account
2. Go to "My Orders"
3. Find your order and click "Track Package"
4. View real-time shipping updates

**Tracking Information:**
- Order processed: Your order has been confirmed
- Shipped: Package is in transit
- Out for delivery: Package will arrive today
- Delivered: Package has been delivered

**Delivery Issues:**
If your package shows as delivered but you haven't received it:
- Check with neighbors or building management
- Look around your delivery area (porches, garages)
- Verify the delivery address in your account
- Contact the shipping carrier directly

**Shipping Timeframes:**
- Standard shipping: 5-7 business days
- Express shipping: 2-3 business days
- Overnight shipping: Next business day

If your package is significantly delayed, please contact our support team with your order number.`,
      tags: ['shipping', 'delivery', 'tracking', 'orders'],
      category: 'shipping',
      status: 'published'
    },
    {
      title: 'Creating and managing support tickets',
      body: `Our support ticket system helps you get quick and efficient help:

**Creating a Ticket:**
1. Click "Create Ticket" in your account dashboard
2. Choose the appropriate category (Billing, Technical, Shipping, Other)
3. Write a clear, descriptive title
4. Provide detailed information about your issue
5. Attach any relevant files or screenshots
6. Submit your ticket

**Best Practices for Tickets:**
- Use clear, specific titles
- Include steps to reproduce issues
- Provide error messages exactly as they appear
- Mention what you were trying to accomplish
- Include your operating system and browser if relevant

**Ticket Status Meanings:**
- Open: Newly created, awaiting triage
- Triaged: Categorized and prioritized by our AI system
- Waiting Human: Assigned to a support agent for review
- Resolved: Issue has been addressed with a solution
- Closed: Ticket completed and no further action needed

**Response Times:**
- High priority: 2 hours
- Normal priority: 24 hours
- Low priority: 48 hours

You'll receive email notifications when your ticket status changes or when we reply.`,
      tags: ['support', 'tickets', 'help', 'guide'],
      category: 'other',
      status: 'published'
    },
    {
      title: 'Account Security Best Practices',
      body: `Keep your account secure with these recommendations:

**Password Security:**
- Use a unique, strong password with at least 12 characters
- Include uppercase, lowercase, numbers, and special characters
- Never reuse passwords from other accounts
- Consider using a password manager

**Two-Factor Authentication:**
- Enable 2FA in your account settings
- Use an authenticator app rather than SMS when possible
- Keep backup codes in a secure location

**Account Monitoring:**
- Regularly review your account activity
- Check for unfamiliar login locations or devices
- Monitor billing statements for unauthorized charges
- Update your contact information when it changes

**Safe Browsing:**
- Always log in through our official website
- Look for the lock icon in your browser's address bar
- Never click login links in suspicious emails
- Log out when using public computers

**If Your Account is Compromised:**
1. Change your password immediately
2. Enable two-factor authentication
3. Review and revoke any suspicious sessions
4. Check for unauthorized changes to your account
5. Contact our security team

We take security seriously and continuously monitor for suspicious activity.`,
      tags: ['security', 'account', 'password', 'safety'],
      category: 'other',
      status: 'published'
    }
  ],

  tickets: [
    {
      title: 'Refund for double charge on order #1234',
      description: `I was charged twice for my recent order #1234. My credit card statement shows two identical charges of $89.99 on the same day. I only placed one order and received one confirmation email. 

The charges appeared on March 15th, both for the exact same amount. My order was for a wireless headset and the first charge was expected, but the second one appears to be an error.

I have attached a screenshot of my credit card statement showing both charges. Please investigate this issue and process a refund for the duplicate charge.

Order details:
- Order #1234
- Date: March 15, 2024
- Amount: $89.99
- Payment method: Credit card ending in 4567

I need this resolved quickly as it affects my available credit limit.`,
      category: 'billing',
      attachmentUrls: []
    },
    {
      title: 'Application crashes with 500 error on login',
      description: `I'm experiencing a persistent 500 Internal Server Error when trying to log into my account. This started happening yesterday around 3 PM EST and continues today.

Steps I've tried:
1. Cleared browser cache and cookies
2. Tried different browsers (Chrome, Firefox, Safari)
3. Used incognito/private browsing mode
4. Restarted my computer
5. Tried from different networks (home wifi, mobile data)

The error occurs immediately after I enter my credentials and click "Sign In". The page briefly shows "Loading..." then displays a generic 500 error page.

Browser console shows: "Failed to fetch user data - 500 Internal Server Error"

This is preventing me from accessing important account information and I have a payment due tomorrow. Please help resolve this urgently.

My account email is john@customer.com and I last successfully logged in on March 13th.`,
      category: 'tech',
      attachmentUrls: []
    },
    {
      title: 'Package marked delivered but not received',
      description: `My order #5678 shows as "Delivered" in the tracking system as of yesterday at 2:30 PM, but I haven't received the package. I was home all day and no delivery was made to my address.

Order details:
- Order #5678
- Tracking number: 1Z999AA1234567890
- Delivery address: 123 Main St, Apt 4B, Anytown, ST 12345
- Expected delivery: March 16, 2024
- Status shows: Delivered March 16 at 2:30 PM

I've checked with my neighbors and building management - no one has seen any packages. I also checked all possible delivery locations around my apartment building including the mailroom, leasing office, and package lockers.

The tracking information doesn't provide a photo or signature confirmation, which seems unusual for a $150 order. This package contains a birthday gift that I need by this weekend.

Can you please investigate with the shipping carrier and help locate my package? If it's truly lost, I'll need a replacement or refund.`,
      category: 'shipping',
      attachmentUrls: []
    }
  ]
};

async function seedDatabase() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    console.log('Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      Article.deleteMany({}),
      Ticket.deleteMany({}),
      Config.deleteMany({})
    ]);

    // Create users
    console.log('Creating users...');
    const users = [];
    for (const userData of seedData.users) {
      const user = new User(userData);
      await user.save();
      users.push(user);
      console.log(`Created user: ${user.name} (${user.role})`);
    }

    // Create articles
    console.log('Creating articles...');
    const admin = users.find(u => u.role === 'admin');
    const articles = [];
    for (const articleData of seedData.articles) {
      const article = new Article({
        ...articleData,
        author: admin._id
      });
      await article.save();
      articles.push(article);
      console.log(`Created article: ${article.title}`);
    }

    // Create tickets
    console.log('Creating tickets...');
    const customers = users.filter(u => u.role === 'user');
    for (let i = 0; i < seedData.tickets.length; i++) {
      const ticketData = seedData.tickets[i];
      const customer = customers[i % customers.length];
      
      const ticket = new Ticket({
        ...ticketData,
        createdBy: customer._id
      });
      await ticket.save();
      console.log(`Created ticket: ${ticket.title}`);
    }

    // Create default config
    console.log('Creating default configuration...');
    const config = new Config({
      autoCloseEnabled: true,
      confidenceThreshold: 0.78,
      slaHours: 24,
      categoryThresholds: {
        billing: 0.75,
        tech: 0.80,
        shipping: 0.70,
        other: 0.85
      }
    });
    await config.save();
    console.log('Created default configuration');

    console.log('\n✅ Database seeded successfully!');
    console.log('\nTest accounts created:');
    console.log('Admin: admin@helpdesk.com / admin123');
    console.log('Agent: agent@helpdesk.com / agent123');
    console.log('User: john@customer.com / customer123');
    console.log('User: jane@customer.com / customer123');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  }
}

// Run the seed function
seedDatabase();