#  LUMORA

### Travel Smarter. Manage Better. Stay Safer.

LUMORA is a modern web application that brings travel planning, budget management, trip exploration, contact management, and personal safety features together in one place.

<p align="center">
  <a href="https://lumora-full-stack-tr-f4ak.bolt.host/#/profile"><img src="https://img.shields.io/badge/🌐_LIVE_DEMO-Visit_LUMORA-7C3AED?style=for-the-badge" alt="Live Demo" /></a>
  <a href="https://github.com/priyankanadendla/-LUMORA"><img src="https://img.shields.io/badge/GitHub-Source_Code-181717?style=for-the-badge&logo=github" alt="GitHub Repository" /></a>
</p>

---

##  Project Links

-  **Live Website:** [Open LUMORA](https://lumora-full-stack-tr-f4ak.bolt.host/#/profile)
-  **GitHub Repository:** [View Source Code](https://github.com/priyankanadendla/-LUMORA)

##  About LUMORA

LUMORA is designed to bring useful travel-related tools into one application. It provides a structured interface for trips, budgets, exploration, contacts, user profiles, and safety-related features.

##  Features

-  **Authentication:** Sign-in, registration, and password-reset interfaces.
-  **Dashboard:** Central access to application features.
-  **Trip Management:** Trip listing and individual trip details.
-  **Budget Management:** A dedicated travel budgeting section.
-  **Explore:** An interface for discovering travel-related content.
-  **Contact Management:** A dedicated contacts page.
-  **Personal Safety:** A safety-focused section.
-  **Trip Sharing:** An interface for sharing trip-related information.
-  **User Profile:** A dedicated profile page.
-  **Backend Integration:** Supabase client configuration, database migrations, and a serverless function.

*Feature availability depends on implementation and backend configuration.*

##  Tech Stack

| Technology | Purpose |
|---|---|
| React | User interface |
| TypeScript | Type-safe development |
| Vite | Development server and build tooling |
| Tailwind CSS | Styling |
| Supabase | Backend and database integration |
| ESLint | Code quality checks |
| Git & GitHub | Version control and source hosting |

##  Project Structure

```text
LUMORA/
├── .bolt/
├── src/
│   ├── components/
│   ├── context/
│   ├── lib/
│   ├── pages/
│   ├── types/
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── supabase/
│   ├── functions/
│   ├── migrations/
│   └── config.toml
├── .gitignore
├── index.html
├── package.json
├── package-lock.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

##  Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/)
- npm
- [Git](https://git-scm.com/)

### 1. Clone the Repository

```bash
git clone https://github.com/priyankanadendla/-LUMORA.git
```

### 2. Navigate to the Project

```bash
cd -LUMORA
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Environment Variables

If backend credentials are required, create a `.env` file in the project root and use the variable names expected by `src/lib/supabase.ts`.

Example for a typical Vite and Supabase configuration:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_publishable_or_anon_key
```

Check the source code for the exact required variable names. Never commit passwords, private API keys, or Supabase service-role keys.

### 5. Run the Development Server

```bash
npm run dev
```

Open the local URL printed in your terminal.

### 6. Build for Production

```bash
npm run build
```

### 7. Run Lint Checks

```bash
npm run lint
```

Available commands depend on the scripts in `package.json`.

## 🗄️ Backend & Database

The repository includes Supabase configuration, SQL migration files, and a serverless function. Configure the appropriate Supabase project, environment variables, authentication, database permissions, and Row Level Security policies before production use.

Review migration files before applying them to a database. A working frontend does not automatically mean the backend is fully configured.

## 🌍 Deployment

The live website is hosted at:

**[Open LUMORA Live Demo](https://lumora-full-stack-tr-f4ak.bolt.host/#/profile)**

When deploying a new version, verify the production build, environment variables, authentication, database access, and application routes.

##  Security

- Keep private credentials out of source control.
- Use environment variables for configuration.
- Review database access policies and authentication flows.
- Never expose Supabase service-role credentials in frontend code.

##  Future Improvements

- Enhance trip planning and budget workflows.
- Improve responsive design and accessibility.
- Add automated testing.
- Strengthen backend validation and security checks.
- Improve deployment automation.

##  Contributing

1. Fork the repository.
2. Create a feature branch.
3. Make and test your changes.
4. Submit a pull request.

##  License

No license has been specified yet. Add a suitable license if you intend to define how others may reuse or distribute this project's code.

---

<p align="center">
  <strong> LUMORA — Travel Smarter. Manage Better. Stay Safer.</strong><br/>
  Built with React, TypeScript, Vite, and Supabase.
</p>
