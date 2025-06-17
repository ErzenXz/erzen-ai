# ErzenAI Open

![ErzenAI Open](https://raw.githubusercontent.com/erzenai/erzen-ai-open/main/erzenai-banner.png)

**ErzenAI Open** is a powerful, open-source AI chat platform that brings together the best of modern AI into a single, cohesive interface. It's designed to be a flexible, feature-rich, and self-hostable alternative to mainstream AI chat services.

This platform allows you to connect to multiple AI providers (including OpenAI, Google, Anthropic, and many more), use a variety of AI models, and leverage powerful tools like web search, code analysis, and image generation. It's built on a modern tech stack with a real-time backend, ensuring a fast and seamless user experience.

## ✨ Features

- **Multi-Provider & Multi-Model**: Seamlessly switch between top AI providers and their models.
  - **OpenAI**: GPT-4o, GPT-4.1, etc.
  - **Google**: Gemini 2.5 Pro, Gemini Flash, etc.
  - **Anthropic**: Claude 3.5 Sonnet, Opus, etc.
  - **Groq**: Llama 3.1, Mixtral, etc. (ultra-fast inference)
  - **OpenRouter**, **DeepSeek**, **Mistral**, **Cohere**, **Grok**
- **Bring Your Own Keys**: Use the platform's built-in keys with a generous free tier, or add your own API keys for unlimited usage.
- **Credit-Based Usage System**: A fair, token-based credit system for using built-in keys, with monthly resets.
  - **Free Plan**: 100 credits, $1 spending limit
  - **Pro Plan**: 500 credits, $8 spending limit
  - **Ultra Plan**: 2500 credits, $20 spending limit
- **Powerful Integrated Tools**:
  - **Web Search**: Real-time access to web search results.
  - **Image Generation**: Create images directly within the chat.
  - **Code Analysis**: Analyze and understand code snippets.
  - **Memory & Datetime**: And many more tools to enhance the AI's capabilities.
- **Modern, Responsive UI**: A clean and intuitive interface built with Shadcn UI, Tailwind CSS, and Next.js themes. Includes light/dark mode and customizable color themes.
- **Conversation Management**:
  - Pin, share, and export conversations.
  - Branching conversations to explore different lines of thought.
- **Real-time Backend**: Built on Convex for a seamless, real-time experience with optimistic updates.
- **Customizable**: Set custom system prompts, manage favorite models, and tweak AI settings to your liking.
- **Self-Hostable**: Easy to deploy on Vercel with a few simple steps.

## 🚀 Tech Stack

- **Framework**: [React](https://reactjs.org/) (with Vite)
- **Backend & Database**: [Convex](https://convex.dev/)
- **UI**: [Shadcn UI](https://ui.shadcn.com/) & [Tailwind CSS](https://tailwindcss.com/)
- **Authentication**: [Convex Auth](https://docs.convex.dev/auth)
- **Deployment**: [Vercel](https://vercel.com/)

## 🔧 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [pnpm](https://pnpm.io/) (or `npm`/`yarn`)

### 1. Clone the Repository

```bash
git clone https://github.com/erzenai/erzen-ai-open.git
cd erzen-ai-open
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Set Up Convex

If you haven't used Convex before, install the CLI:
```bash
pnpm dlx convex
```

Authenticate with Convex:
```bash
pnpm dlx convex dev
```
This command will guide you through logging in and creating a new project. It will create a `convex.json` file with your project details.

### 4. Set Up Environment Variables

You'll need to add your Convex deployment URL to your project's environment variables.

1.  Create a `.env.local` file in the root of your project.
2.  Get your deployment URL from the Convex dashboard or the output of `npx convex dev`.
3.  Add it to the `.env.local` file:

```
VITE_CONVEX_URL=your-convex-url
```

To enable authentication and other services, you'll need to add more environment variables to the Convex dashboard:

1.  Go to your project on the [Convex Dashboard](https://dashboard.convex.dev/).
2.  Navigate to **Settings** -> **Environment Variables**.
3.  Add the following variables:
    - `AUTH_GITHUB_ID`: Your GitHub OAuth App's Client ID.
    - `AUTH_GITHUB_SECRET`: Your GitHub OAuth App's Client Secret.
    - `OPENAI_API_KEY`: Your OpenAI API key (for built-in usage).
    - `TAVILY_API_KEY`: Your Tavily Search API key.
    - *...and other API keys for the providers you want to support.*

### 5. Run the Development Server

Start the development server and the Convex backend simultaneously:

```bash
pnpm dev
```

Your application should now be running at `http://localhost:5173`.

## 🌐 Deployment

This project is optimized for deployment on [Vercel](https://vercel.com/).

### 1. Push to GitHub

Create a new repository on GitHub and push your local code to it.

### 2. Import Project on Vercel

1.  Go to your Vercel dashboard and click **Add New...** -> **Project**.
2.  Import your GitHub repository.
3.  Vercel should automatically detect that you are using Vite and configure the build settings.

### 3. Configure Environment Variables on Vercel

1.  In your Vercel project settings, go to the **Environment Variables** section.
2.  Add your Convex deployment URL:
    - `VITE_CONVEX_URL`: `your-convex-url`
3.  Make sure the environment variables you set in the Convex dashboard are also available to your Vercel deployment if needed by the frontend.

### 4. Deploy

Click the **Deploy** button. Vercel will build and deploy your application. After a few moments, your ErzenAI Open instance will be live!

## 🤝 Contributing

Contributions are welcome! If you have ideas for new features, bug fixes, or improvements, please open an issue or submit a pull request.

## 📄 License

This project is licensed under the MIT License. See the `LICENSE` file for details.
