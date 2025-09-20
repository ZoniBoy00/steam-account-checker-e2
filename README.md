# Steam Account Checker

*A secure, production-ready Steam account validation tool built with Next.js*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/zoniboy00s-projects/v0-steam-checker)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.app-black?style=for-the-badge)](https://v0.app/chat/projects/FvPnd2yUBxN)
[![GitHub](https://img.shields.io/badge/GitHub-ZoniBoy00-black?style=for-the-badge&logo=github)](https://github.com/ZoniBoy00)

## 🚀 Overview

Steam Account Checker is a comprehensive web application that allows you to validate Steam accounts in bulk using Steam tokens. The application features enterprise-grade security, real-time validation, and an intuitive user interface optimized for both desktop and mobile devices.

## ✨ Features

### Core Functionality
- **Bulk Account Validation**: Check multiple Steam accounts simultaneously with real-time progress tracking
- **Multiple Input Methods**: Support for Steam tokens
- **Comprehensive Results**: Account status, ban information, profile details, and inventory data
- **Smart Error Handling**: Graceful handling of API limitations, rate limits, and temporary failures
- **Export Capabilities**: Download results in CSV format or export clean tokens
- **File Import**: Support for text files with username----token format
- **Mobile Optimized**: Fully responsive design for all devices

### Advanced Inventory System
- **Multi-Method Access**: Uses Steam Web API, SkinBackpack API, and Community endpoints
- **Smart Fallbacks**: Automatically tries alternative methods when primary access fails
- **Private Detection**: Correctly identifies and handles private inventories
- **Authentication Support**: Steam login for enhanced inventory access
- **Rate Limit Handling**: Intelligent rate limiting with automatic retry logic
- **Value Estimation**: Basic inventory value calculation for CS2 items

### Security Features
- **XSS Protection**: Comprehensive input sanitization and validation
- **CSRF Protection**: Token-based request validation
- **Rate Limiting**: Advanced rate limiting with IP-based blocking (10 requests/minute for inventory)
- **DoS Prevention**: Request timeouts and content-length limits
- **Encrypted Storage**: API keys encrypted before localStorage storage
- **Secure Headers**: CSP, HSTS, and other security headers implemented

### User Experience
- **Responsive Design**: Mobile-first design with Tailwind CSS v4
- **Enhanced Animations**: Beautiful background animations with floating orbs and grid patterns
- **Professional UI**: Glass-morphism effects and smooth transitions
- **Tab Navigation**: Clean tabbed interface for Checker, Results, and Settings
- **Progress Tracking**: Real-time validation progress with detailed feedback
- **Toast Notifications**: User-friendly success, error, and warning messages
- **Help System**: Comprehensive help modal with detailed usage instructions

## 🛠️ Technology Stack

- **Framework**: Next.js 14.2.32 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 with custom animations
- **UI Components**: shadcn/ui with custom enhancements
- **Security**: Custom middleware with comprehensive protection
- **APIs**: Steam Web API, SkinBackpack API, Steam Community API
- **Deployment**: Vercel

## 🔧 Installation & Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Steam Web API Key (recommended for best results)

### Local Development

1. **Clone the repository**
   \`\`\`bash
   git clone https://github.com/ZoniBoy00/steam-account-checker.git
   cd steam-account-checker
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

### Getting Started

#### 1. Steam Web API Key (Recommended)
1. Visit [steamcommunity.com/dev/apikey](https://steamcommunity.com/dev/apikey)
2. Log in with your Steam account
3. Enter any domain name (e.g., "localhost" for testing)
4. Copy the generated API key
5. Go to Settings tab and paste your API key

#### 2. Steam Authentication (Optional)
1. Go to Settings tab and find "Steam Authentication"
2. Click "Login with Steam" for enhanced inventory access
3. Complete Steam's official login process
4. Authenticated sessions bypass many API restrictions

### Adding Steam Tokens

The checker supports multiple token formats:

**Username Format (Recommended):**
\`\`\`
username----eyJhbGciOiJFRFJTQSIsInR5cCI6IkpXVCJ9...
\`\`\`

**Direct JWT:**
\`\`\`
eyJhbGciOiJFRFJTQSIsInR5cCI6IkpXVCJ9...
\`\`\`

**Cookie Format:**
\`\`\`
steamLoginSecure=76561198123456789%7C%7CeyJhbGciOiJFRFJTQSIsInR5cCI6IkpXVCJ9...
\`\`\`

### File Upload
1. Create a text file with tokens (one per line)
2. Click "Import File" and select your .txt file
3. Supported formats: .txt, .csv, .log (up to 5MB)
4. Tokens are automatically parsed and validated

### Running Checks
1. Add tokens using manual entry or file upload
2. Configure Steam Web API key in Settings
3. (Optional) Login with Steam for better inventory access
4. Click "Check Accounts" to start validation
5. Monitor real-time progress
6. View detailed results in Results tab

## 🔍 Understanding Results

### Account Status
- **Valid**: Account is active and accessible
- **Invalid**: Token is invalid or expired
- **Expired**: Session has expired and needs renewal

### Ban Status
- **VAC Banned**: Valve Anti-Cheat ban detected
- **Community Banned**: Steam Community ban
- **Game Bans**: Game-specific bans (e.g., Overwatch in CS2)

### Inventory Status
- **Loaded**: Inventory data successfully retrieved with item count and estimated value
- **Private**: Inventory is set to private (correctly detected)
- **Auth Required**: Steam authentication needed for access
- **Temporarily Unavailable**: Steam servers busy or API limits reached
- **Access Restricted**: Rate limited or temporary Steam restrictions

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

## 🔧 Troubleshooting

### Common Issues

**Inventory Access Problems:**
- **"Temporarily unavailable"**: Steam servers may be busy, try again later
- **"Steam Web API access issue"**: API key may lack inventory permissions
- **"Access restricted"**: Steam experiencing high traffic, wait and retry
- **"Private inventory"**: Correctly detected, cannot be accessed

**API Key Issues:**
- **"Invalid API key"**: Verify key is correct and active
- **"Access denied"**: API key may lack necessary permissions
- **"Rate limited"**: Wait before making more requests

**General Issues:**
- **File upload not working**: Ensure file is .txt/.csv/.log format under 5MB
- **Tokens not parsing**: Check format matches expected patterns
- **Mobile display issues**: Clear browser cache and reload

### Performance Tips
- Use Steam authentication for better inventory access
- Wait between large batch checks to avoid rate limits
- Keep API key secure and don't share it
- Use file upload for large token lists

## 🔒 Security & Privacy

- **Local Processing**: All data processed locally in your browser
- **No Data Storage**: No tokens or account data stored on external servers
- **Encrypted API Keys**: API keys encrypted before localStorage storage
- **Official APIs**: Only communicates with official Steam servers
- **Steam Authentication**: Uses official Steam OpenID protocol
- **Rate Limiting**: Prevents abuse with intelligent rate limiting

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

Please use the [GitHub Issues](https://github.com/ZoniBoy00/steam-account-checker/issues) page to report bugs or request new features.

## 📞 Support

- **GitHub**: [@ZoniBoy00](https://github.com/ZoniBoy00)
- **Issues**: [Report a bug](https://github.com/ZoniBoy00/steam-account-checker/issues)

---

**Built with ❤️ using [v0.app](https://v0.app)**
