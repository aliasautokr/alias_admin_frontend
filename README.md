# Aliasauto Admin Dashboard

A modern, responsive admin dashboard built with Next.js 15, TypeScript, and TailwindCSS for the Aliasauto platform.

## 🚀 Features

- **Next.js 15** with App Router
- **TypeScript** for type safety
- **TailwindCSS** for styling
- **ShadCN UI** components
- **NextAuth.js** for authentication
- **React Query** for state management
- **Axios** for API calls
- **Lucide React** for icons
- **Responsive design** with mobile support

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS + ShadCN UI
- **State Management**: React Query (TanStack)
- **HTTP Client**: Axios
- **Authentication**: NextAuth.js (JWT-based)
- **Icons**: Lucide React
- **Backend API**: https://api.aliasauto.kr

## 📦 Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd aliasauto_admin
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Update the environment variables in `.env.local`:
```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here
NEXT_PUBLIC_API_URL=https://api.aliasauto.kr
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🏗️ Project Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   └── layout.tsx
│   ├── api/
│   │   └── auth/
│   └── layout.tsx
├── components/
│   ├── ui/                 # ShadCN UI components
│   ├── layout/             # Layout components
│   └── providers/          # Context providers
├── lib/
│   ├── auth.ts            # NextAuth configuration
│   ├── axios.ts           # Axios instance
│   └── utils.ts           # Utility functions
└── types/
    └── index.ts           # TypeScript type definitions
```

## 🎨 Theme System

The app features a beautiful dark/light theme system with:

- **Dark Theme**: Midnight color scheme (#0F0F23 background)
- **Light Theme**: Clean white background
- **Custom Button Gradients**: Amber to Orange gradient buttons
- **Theme Toggle**: Easy switching between themes

## 🎨 UI Components

The project uses ShadCN UI components with a custom admin theme. Key components include:

- **Button** - Various button styles and sizes
- **Card** - Content containers with headers and footers
- **Input** - Form input fields
- **Avatar** - User profile images
- **Dropdown Menu** - Context menus and user actions
- **Separator** - Visual dividers
- **Skeleton** - Loading placeholders

## 📱 Responsive Design

The dashboard is fully responsive with:

- **Mobile-first** approach
- **Collapsible sidebar** on mobile devices
- **Touch-friendly** interface
- **Adaptive layouts** for different screen sizes

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy automatically on every push

### Environment Variables for Production

```env
NEXTAUTH_URL=https://admin.aliasauto.kr
NEXTAUTH_SECRET=your-production-secret
NEXT_PUBLIC_API_URL=https://api.aliasauto.kr
```

## 🧪 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors

### Code Style

The project uses:
- **ESLint** for code linting
- **Prettier** for code formatting
- **TypeScript** for type checking

## 🔧 Configuration

### TailwindCSS

Custom theme colors are defined in `tailwind.config.ts` with admin-specific color schemes.

### Theme Provider

Theme switching is configured with:
- Dark/light mode support
- System preference detection
- Custom midnight dark theme
- Gradient button styles

### React Query

Query client is configured in `components/providers/query-provider.tsx` with:
- Default stale time
- Retry logic
- Error handling
- DevTools integration

## 📝 API Integration

The app is configured to work with the Aliasauto API at `https://api.aliasauto.kr`. The Axios instance includes:

- Automatic JWT token injection
- Request/response interceptors
- Error handling
- Timeout configuration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📄 License

This project is proprietary software for Aliasauto platform.

## 🆘 Support

For support and questions, please contact the development team.