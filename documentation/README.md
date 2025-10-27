# Resolvet Documentation

Welcome to the Resolvet support ticket management system documentation. This directory contains comprehensive documentation covering all aspects of the application.

## Documentation Index

### 📋 [01_Project_Documentation.md](./01_Project_Documentation.md)
**Overview and Project Management**

- Executive summary and project purpose
- Goals, objectives, and success criteria
- Project scope and timeline
- Stakeholder information
- Risk management
- Future enhancements
- Project status and milestones

**Who should read this:** Project managers, stakeholders, new team members, anyone needing high-level project understanding.

---

### 📐 [02_Requirements_Design_Documentation.md](./02_Requirements_Design_Documentation.md)
**System Requirements and Design**

- Functional requirements
- System architecture diagrams
- Technology stack
- Component design
- Interface specifications
- Acceptance criteria
- Design patterns
- Security requirements

**Who should read this:** Developers, architects, QA engineers, business analysts.

---

### 🔧 [03_Technical_Documentation.md](./03_Technical_Documentation.md)
**Technical Implementation and API Reference**

- System architecture details
- Getting started guide
- Complete API documentation
- Database schema and ER diagrams
- Authentication and authorization
- Code documentation
- Deployment guide
- Troubleshooting

**Who should read this:** Developers, system administrators, DevOps engineers, API consumers.

---

## Quick Start

**New to Resolvet?** Start here:

1. **[01_Project_Documentation.md](./01_Project_Documentation.md#-executive-summary)** - Read the executive summary to understand what Resolvet is
2. **[03_Technical_Documentation.md](./03_Technical_Documentation.md#-getting-started)** - Follow the getting started guide to set up the application
3. **[03_Technical_Documentation.md](./03_Technical_Documentation.md#-api-documentation)** - Explore the API endpoints
4. **[02_Requirements_Design_Documentation.md](./02_Requirements_Design_Documentation.md#-functional-requirements)** - Understand the features and requirements

## Documentation by Use Case

### 🚀 Setting Up the Application
- [Installation Guide](./03_Technical_Documentation.md#-getting-started)
- [Environment Configuration](./03_Technical_Documentation.md#-environment-configuration)
- [Database Setup](./03_Technical_Documentation.md#-database-migration)
- [Deployment Guide](./03_Technical_Documentation.md#-deployment-guide)

### 🔌 Working with the API
- [API Overview](./03_Technical_Documentation.md#-api-documentation)
- [Authentication](./03_Technical_Documentation.md#-authentication--authorization)
- [Example API Calls](./03_Technical_Documentation.md#-example-api-calls)
- [OpenAPI Documentation](./03_Technical_Documentation.md#-openapi-documentation)

### 🏗️ Understanding the Architecture
- [System Architecture](./03_Technical_Documentation.md#-system-architecture)
- [Technology Stack](./03_Technical_Documentation.md#-technology-stack)
- [Database Schema](./03_Technical_Documentation.md#-database-schema)
- [Component Design](./02_Requirements_Design_Documentation.md#-component-design)

### 📊 Features and Requirements
- [Functional Requirements](./02_Requirements_Design_Documentation.md#-functional-requirements)
- [Ticket Management](./02_Requirements_Design_Documentation.md#-ticket-management)
- [Analytics](./02_Requirements_Design_Documentation.md#-analytics-and-reporting)
- [File Management](./02_Requirements_Design_Documentation.md#-file-management)

### 🐛 Troubleshooting
- [Common Issues](./03_Technical_Documentation.md#-common-issues)
- [Development Tools](./03_Technical_Documentation.md#-development-tools)
- [Logs and Debugging](./03_Technical_Documentation.md#-logs-and-debugging)
- [Performance Optimization](./03_Technical_Documentation.md#-performance-optimization)

## Additional Resources

### Internal Documentation
The backend directory also contains feature-specific documentation:

- **[ATTACHMENT_UPLOAD_README.md](../backend/ATTACHMENT_UPLOAD_README.md)** - File upload guide
- **[INVITATIONS_FEATURE.md](../backend/INVITATIONS_FEATURE.md)** - Invitation system guide
- **[CSV_IMPORT_README.md](../backend/CSV_IMPORT_README.md)** - CSV import functionality
- **[report.md](../backend/report.md)** - API endpoint inventory
- **[openapi.json](../backend/openapi.json)** - OpenAPI specification

### External Resources

- [Prisma Documentation](https://www.prisma.io/docs/)
- [Next.js Documentation](https://nextjs.org/docs/)
- [Express.js Documentation](https://expressjs.com/)
- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [JWT Best Practices](https://datatracker.ietf.org/doc/html/rfc7519)

## Application Structure

```
Resolvet/
├── backend/               # Express.js API server
│   ├── controllers/      # Business logic
│   ├── routes/           # API routes
│   ├── middleware/       # Express middleware
│   ├── prisma/          # Database schema & migrations
│   └── utils/           # Utility functions
├── client/              # Next.js frontend
│   ├── src/
│   │   ├── app/         # Next.js pages
│   │   ├── components/  # React components
│   │   └── lib/         # API client & utilities
│   └── public/          # Static assets
└── documentation/       # This documentation
    ├── README.md        # This file
    ├── 01_Project_Documentation.md
    ├── 02_Requirements_Design_Documentation.md
    └── 03_Technical_Documentation.md
```

## System Architecture Overview

Resolvet is a full-stack support ticket management system:

**Backend:**
- Node.js + Express.js REST API
- PostgreSQL database with Prisma ORM
- JWT-based authentication
- Role-based access control
- Cloudinary for file storage
- OpenAPI/Swagger documentation

**Frontend:**
- Next.js 15 with React 19
- Server-side rendering
- Zustand for state management
- TailwindCSS for styling
- Recharts for analytics

## Key Features

✅ **Multi-Role Support**: Super Admin, Admin, Agent, Customer  
✅ **Ticket Management**: Create, update, track support tickets  
✅ **File Attachments**: Images, audio, video upload support  
✅ **Analytics**: Admin dashboard with performance metrics  
✅ **Invitations**: Email-based user onboarding  
✅ **Tag System**: Categorize and filter tickets  
✅ **Comments**: Threaded conversation support  
✅ **Audit Trail**: Track all ticket changes  
✅ **API Documentation**: Auto-generated Swagger/OpenAPI docs  

## Support and Contributing

For questions or issues:
1. Check the [Troubleshooting section](./03_Technical_Documentation.md#-troubleshooting)
2. Review the [API documentation](./03_Technical_Documentation.md#-api-documentation)
3. Check backend feature docs (ATTACHMENT_UPLOAD_README.md, etc.)

## Version Information

- **Version:** 1.0.1
- **Last Updated:** January 2025
- **Status:** Active Development

---

**Happy Coding! 🚀**

