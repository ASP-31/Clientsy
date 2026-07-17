# Clientsy

An all-in-one freelance workspace and CRM designed to streamline client management, invoices, e-sign proposals, manually-scheduled meetings, intake forms, project tracking, and verified reviews. 

Clientsy features a premium workspace layout designed to provide freelancers with a modern, high-performance portal to manage their businesses.

## Tech Stack

- **Frontend**: Single-Page Application (SPA) built with vanilla JS and modern, tactile CSS custom properties.
- **Backend**: Node.js & Express.js server providing secure REST API endpoints.
- **Database**: MongoDB (Atlas) database mapping workspaces, clients, vaults, proposals, invoices, and meetings.

## Active Features

- **CRM Lead Pipeline**: Manage client prospects through customizable drag-and-drop columns from contact to conversion.
- **Clients Vault**: Organise client documentation (contracts, assets, invoices) in interactive, tabbed card cabinets.
- **Projects**: Visual kanban task boards representing in-progress deliverables.
- **Invoices & Quotes**: Custom itemised billing sheets with integrated GST calculations and status tracking.
- **Proposals & E-Sign**: Draft contract terms and acquire digital signatures on secure, verified landing pages.
- **Intake Forms**: Publish customizable forms to gather requirements directly from new clients.
- **Meetings Manager**: Schedule and log calls and touchpoints directly inside the workspace.
- **Client Reviews**: Generate a verified client review profile with embeddable review badges.
- **Client-Facing Portal**: Dedicated view for clients to log in, review deliverables, sign contracts, and pay invoices.
- **Team Members**: Invite and manage collaborators inside the workspace.

## Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/ASP-31/Clientsy.git
   cd Clientsy
   ```

2. **Configure Environment Variables**
   Create a `.env` file in the root directory based on `.env.example`:
   ```env
   PORT=5000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_signing_key
   ```

3. **Install Dependencies**
   ```bash
   npm install
   ```

4. **Launch Application**
   ```bash
   npm start
   ```

## License

Distributed under the MIT License.

