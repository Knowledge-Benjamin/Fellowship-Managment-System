# Fellowship Information Management System

A modern, full-stack digital registration and check-in system for fellowship management.

## 🚀 Features

- **Digital Registration**: Easy member registration with QR code generation
- **QR Check-in**: Fast, contactless attendance tracking using QR codes
- **Transport Pre-registration**: Book transport for fellowship events
- **Offline-First**: PWA support for offline functionality
- **Modern UI**: Premium, clean interface with smooth animations

## 🛠️ Tech Stack

### Frontend
- React 19.2.0
- Vite 7.2.4
- Tailwind CSS 4.1.17
- TypeScript
- PWA Support

### Backend
- Node.js with Express 5.1.0
- TypeScript
- Prisma ORM 6.0.0
- PostgreSQL

## 📦 Installation

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL
- npm or yarn

### Setup

1. **Clone the repository**
```bash
git clone https://github.com/Knowledge-Benjamin/Fellowship-Managment-System.git
cd Fellowship-Manager
```

2. **Install dependencies**
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

3. **Configure environment variables**

Create a `.env` file in the `backend` directory:
```env
PORT=3000
DATABASE_URL="postgresql://username:password@localhost:5432/fellowship_manager?schema=public"
```

4. **Run database migrations**
```bash
cd backend
npx prisma migrate dev
```

5. **Start the development servers**

Backend:
```bash
cd backend
npm run dev
```

Frontend:
```bash
cd frontend
npm run dev
```

The frontend will be available at `http://localhost:5173` and the backend API at `http://localhost:3000`.

## 📱 Usage

1. **Register Members**: Navigate to the Registration page and fill in member details
2. **Generate QR Codes**: After registration, a unique QR code is generated for each member
3. **Check-in**: Use the Check-in page to scan QR codes for attendance tracking
4. **Book Transport**: Members can pre-register for transport to fellowship events

## 🗄️ Database

View and manage your database using Prisma Studio:
```bash
cd backend
npx prisma studio
```

Access Prisma Studio at `http://localhost:5555`

## 🎨 Design

- Premium solid color palette (Indigo, Pink, Teal)
- Glassmorphism effects
- Smooth animations and transitions
- Creative pseudo-element styling
- Mobile-responsive design

## 📝 License

MIT

## 👨‍💻 Author

Knowledge Benjamin
