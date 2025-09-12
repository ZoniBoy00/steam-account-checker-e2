# Steam Account Checker

*A secure, production-ready Steam account validation tool built with Next.js*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/zoniboy00s-projects/v0-steam-checker)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.app-black?style=for-the-badge)](https://v0.app/chat/projects/FvPnd2yUBxN)
[![GitHub](https://img.shields.io/badge/GitHub-ZoniBoy00-black?style=for-the-badge&logo=github)](https://github.com/ZoniBoy00)

## 🚀 Overview

Steam Account Checker is a comprehensive web application that allows you to validate Steam accounts in bulk using Steam tokens or Steam Web API keys. The application features enterprise-grade security, real-time validation, and an intuitive user interface.

## ✨ Features

### Core Functionality
- **Bulk Account Validation**: Check multiple Steam accounts simultaneously
- **Multiple Input Methods**: Support for Steam tokens and Steam Web API keys
- **Real-time Processing**: Live progress tracking with detailed status updates
- **Comprehensive Results**: Account status, ban information, and profile details
- **Export Capabilities**: Download results in multiple formats

### Security Features
- **XSS Protection**: Comprehensive input sanitization and validation
- **CSRF Protection**: Token-based request validation
- **Rate Limiting**: Advanced rate limiting with IP-based blocking
- **DoS Prevention**: Request timeouts and content-length limits
- **Encrypted Storage**: API keys encrypted before localStorage storage
- **Secure Headers**: CSP, HSTS, and other security headers implemented

### User Experience
- **Responsive Design**: Mobile-first design with Tailwind CSS
- **Dark/Light Mode**: Theme switching with system preference detection
- **Help System**: Comprehensive help modal with usage instructions
- **Progress Tracking**: Real-time validation progress with detailed feedback
- **Error Handling**: Graceful error handling with user-friendly messages

## 🛠️ Technology Stack

- **Framework**: Next.js 14.2.32 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **Security**: Custom middleware with comprehensive protection
- **Deployment**: Vercel

## 🔧 Installation & Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Steam Web API Key (optional, for enhanced features)

### Local Development

1. **Clone the repository**
   \`\`\`bash
   git clone https://github.com/ZoniBoy00/steam-account-checker-e2.git
   cd steam-account-checker-e2
   \`\`\`

2. **Install dependencies**
   \`\`\`bash
   npm install
   # or
   yarn install
   \`\`\`

3. **Environment Setup** (Optional)
   \`\`\`bash
   cp .env.example .env.local
   # Add your Steam Web API key if available
   STEAM_API_KEY=your_steam_api_key_here
   \`\`\`

4. **Run the development server**
   \`\`\`bash
   npm run dev
   # or
   yarn dev
   \`\`\`

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📖 Usage Guide

### Getting Steam Tokens
1. Open Steam in your browser and log in
2. Open Developer Tools (F12)
3. Go to Application/Storage → Cookies → https://steamcommunity.com
4. Find and copy the `steamLoginSecure` cookie value

### Using the Application
1. **Input Method**: Choose between Steam tokens or Steam Web API key
2. **Add Accounts**: Paste tokens or upload a file with account data
3. **Configure Settings**: Set delays, timeouts, and other preferences
4. **Start Validation**: Click "Start Checking" to begin the process
5. **Monitor Progress**: Watch real-time progress and results
6. **Export Results**: Download validated account data

### File Upload Format
The application accepts text files with one Steam token per line:
\`\`\`
76561198000000001||token1_here
76561198000000002||token2_here
76561198000000003||token3_here
\`\`\`

## 🔒 Security Features

### Input Validation
- Comprehensive XSS prevention
- Steam token format validation
- File type and size restrictions
- Malicious content detection

### API Security
- Rate limiting (100 requests per 15 minutes)
- IP-based blocking for abuse prevention
- Request timeout protection
- CSRF token validation
- Secure header implementation

### Data Protection
- API keys encrypted before storage
- No sensitive data logged
- Secure cookie handling
- Content Security Policy (CSP)

## 🚀 Deployment

### Vercel (Recommended)
1. Fork this repository
2. Connect to Vercel
3. Deploy with default settings
4. Add environment variables if needed

### Manual Deployment
1. Build the application: `npm run build`
2. Start the production server: `npm start`
3. Configure reverse proxy (nginx/Apache)
4. Set up SSL certificate

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This tool is for educational and legitimate account management purposes only. Users are responsible for complying with Steam's Terms of Service and applicable laws. The developers are not responsible for any misuse of this application.

## 🐛 Bug Reports & Feature Requests

Please use the [GitHub Issues](https://github.com/ZoniBoy00/steam-account-checker-e2/issues) page to report bugs or request new features.

## 📞 Support

- **GitHub**: [@ZoniBoy00](https://github.com/ZoniBoy00)
- **Issues**: [Report a bug](https://github.com/ZoniBoy00/steam-account-checker-e2/issues)

---

**Built with ❤️ using [v0.app](https://v0.app)**
