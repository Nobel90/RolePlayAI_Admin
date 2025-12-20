# Project Brief

## Overview
**RolePlayAI Admin Dashboard** is a React-based web application that serves as an administrative control panel for managing the RolePlayAI Launcher's dynamic UI settings, DLC content, and catalog generation. It provides a modern interface for configuring launcher appearance, managing DLCs, and synchronizing content with R2 storage.

## Core Purpose
The application enables administrators to:
- **Manage Launcher UI**: Customize button text, labels, background images, logos, and header links
- **DLC Management**: Add, edit, and manage DLC content with metadata
- **Catalog Generation**: Generate and publish catalog.json for launcher DLC discovery
- **R2 Synchronization**: Sync DLC information from R2 bucket to Firebase
- **Multi-App Support**: Manage multiple applications (e.g., RolePlayAI, future apps)
- **Build Type Management**: Configure settings for Production and Staging builds

## Workflow
1. **Admin logs in** via Firebase Authentication
2. **Selects application** and build type (Production/Staging)
3. **Configures launcher UI** settings (buttons, backgrounds, logos, etc.)
4. **Manages DLCs** - adds, edits, or syncs from R2
5. **Publishes catalog** to R2 bucket for launcher discovery
6. **Settings sync** to Firestore for real-time launcher updates

## Target Users
**Primary Users**: Administrators who need to:
- Customize launcher appearance and branding
- Manage DLC content and versions
- Synchronize content between R2 and Firebase
- Generate catalogs for launcher integration

## Key Requirements
1. **Firebase Integration**: Authentication and Firestore for settings storage
2. **R2 Synchronization**: Read DLC information from Cloudflare R2 bucket
3. **Catalog Publishing**: Generate and publish catalog.json to R2
4. **Real-time Updates**: Firestore real-time listeners for launcher sync
5. **Modern UI**: React with TypeScript, shadcn/ui components, Tailwind CSS
6. **Multi-App Architecture**: Support for multiple applications
7. **Build Type Support**: Separate configurations for Production and Staging

## Success Criteria
- Admins can customize all launcher UI elements
- DLCs can be managed with proper metadata
- Catalog.json is generated and published correctly
- R2 sync detects and imports DLC information
- Settings sync to launcher in real-time
- Application deploys to Firebase Hosting successfully
