import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { 
  Brain, 
  Sparkles, 
  Zap, 
  Shield, 
  Users, 
  MessageSquare, 
  ArrowRight,
  Star,
  ChevronRight,
  Globe,
  Code,
  Search,
  Image,
  Check,
  Clock
} from "lucide-react";
import { ParticlesBackground } from "./ParticlesBackground";

const features = [
  {
    icon: Brain,
    title: "Multi-Model AI Access",
    description: "Choose from GPT-4, Claude, Gemini, Mistral, and 20+ other cutting-edge models. Switch seamlessly between providers to find the perfect AI for your task."
  },
  {
    icon: Zap,
    title: "Real-Time Streaming",
    description: "Experience lightning-fast responses with streaming technology. Watch your answers appear in real-time for an interactive conversation experience."
  },
  {
    icon: Shield,
    title: "Privacy & Security",
    description: "Your data stays secure with enterprise-grade encryption. We never store your conversations permanently, and you maintain full control over your information."
  },
  {
    icon: Users,
    title: "Conversation Sharing",
    description: "Share your AI conversations with teammates or friends via secure links. Collaborate on complex problems and build on each other's insights."
  },
  {
    icon: Code,
    title: "Advanced Code Assistant",
    description: "Get expert help with programming across 50+ languages. From debugging to code reviews, architecture advice to performance optimization."
  },
  {
    icon: Search,
    title: "Web Search Integration",
    description: "Access real-time information from the web. Get current news, research data, and up-to-date information integrated directly into your conversations."
  },
  {
    icon: Image,
    title: "Image Generation & Analysis",
    description: "Generate stunning images with AI or analyze existing ones. Perfect for creative projects, presentations, and visual problem-solving."
  },
  {
    icon: MessageSquare,
    title: "Smart Memory System",
    description: "Your AI remembers context across conversations. Build long-term relationships with personalized responses that get better over time."
  },
  {
    icon: Globe,
    title: "Multi-Language Support",
    description: "Communicate in 50+ languages with native-level fluency. Perfect for international teams, language learning, and global collaboration."
  }
];

const stats = [
  { label: "AI Models", value: "20+" },
  { label: "Languages Supported", value: "50+" },
  { label: "Uptime", value: "99.9%" },
  { label: "Response Time", value: "<2s" }
];

const pricingPlans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for getting started with AI conversations",
    credits: 100,
    searches: 10,
    maxSpending: "$1.00",
    features: [
      "100 AI conversation credits",
      "10 web searches per month",
      "Access to all AI models",
      "Real-time streaming responses",
      "Conversation sharing",
      "Multi-language support"
    ],
    popular: false,
    available: true,
    buttonText: "Get Started Free"
  },
  {
    name: "Pro",
    price: "$8",
    period: "month",
    description: "For professionals who need more power",
    credits: 500,
    searches: 200,
    maxSpending: "$8.00",
    features: [
      "500 AI conversation credits",
      "200 web searches per month",
      "Priority model access",
      "Advanced code assistance",
      "Image generation & analysis",
      "Smart memory system",
      "Team collaboration tools",
      "Priority support"
    ],
    popular: true,
    available: false,
    buttonText: "Coming Soon"
  },
  {
    name: "Ultra",
    price: "$20",
    period: "month",
    description: "For teams and power users",
    credits: 2500,
    searches: 1000,
    maxSpending: "$20.00",
    features: [
      "2,500 AI conversation credits",
      "1,000 web searches per month",
      "Unlimited model switching",
      "Custom AI instructions",
      "Advanced analytics",
      "Team management",
      "White-label options",
      "Dedicated support"
    ],
    popular: false,
    available: false,
    buttonText: "Coming Soon"
  }
];

const testimonials = [
  {
    name: "Sarah Chen",
    role: "Software Engineer",
    content: "ErzenAI has revolutionized how I approach coding problems. The AI assistance is incredibly accurate and helpful.",
    rating: 5
  },
  {
    name: "Marcus Johnson",
    role: "Product Manager",
    content: "The team collaboration features are game-changing. We can share insights and build on each other's conversations.",
    rating: 5
  },
  {
    name: "Elena Rodriguez",
    role: "Data Scientist",
    content: "The variety of AI models available gives me the flexibility to choose the best tool for each specific task.",
    rating: 5
  }
];

export function Homepage() {
  const handleGetStarted = () => {
    window.history.pushState({}, '', '/login');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleLearnMore = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/40 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <ParticlesBackground />
      </div>
      
      {/* Gradient Overlays */}
      <div className="absolute inset-0 bg-gradient-to-tr from-primary/8 via-transparent to-accent/8 opacity-60"></div>
      
      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-border/40 backdrop-blur-sm">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Brain className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold text-foreground">ErzenAI</span>
            </div>
            <nav className="hidden md:flex items-center space-x-6">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
              <a href="#about" className="text-muted-foreground hover:text-foreground transition-colors">About</a>
              <a href="#testimonials" className="text-muted-foreground hover:text-foreground transition-colors">Testimonials</a>
              <Button onClick={handleGetStarted} size="sm">
                Get Started
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </nav>
          </div>
        </header>

        {/* Hero Section */}
        <section className="py-20 px-4">
          <div className="container mx-auto text-center">
            <Badge variant="secondary" className="mb-6">
              <Sparkles className="h-3 w-3 mr-1" />
              Powered by Advanced AI
            </Badge>
            
            <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 leading-tight">
              The Future of
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"> AI Conversations</span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
              Experience the next generation of AI-powered conversations. Get instant answers, generate creative content, 
              and boost your productivity with ErzenAI's advanced language models.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button size="lg" onClick={handleGetStarted} className="group">
                Start Chatting Now
                <MessageSquare className="h-5 w-5 ml-2 group-hover:scale-110 transition-transform" />
              </Button>
              <Button variant="outline" size="lg" onClick={handleLearnMore}>
                Learn More
                <ChevronRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl font-bold text-foreground">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 px-4">
          <div className="container mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-foreground mb-4">
                Powerful Features for Every Need
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Discover what makes ErzenAI the perfect AI companion for work, creativity, and learning.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <Card key={index} className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border/40 backdrop-blur-sm bg-card/80">
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <feature.icon className="h-6 w-6 text-primary" />
                      </div>
                      <CardTitle className="text-lg">{feature.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* About Section */}
        <section id="about" className="py-20 px-4">
          <div className="container mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-4xl font-bold text-foreground mb-6">
                  Built for the Modern World
                </h2>
                <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                  ErzenAI combines the latest advances in artificial intelligence with an intuitive, 
                  user-friendly interface. Whether you're a developer, writer, student, or professional, 
                  our platform adapts to your unique needs and workflow.
                </p>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Globe className="h-5 w-5 text-primary" />
                    <span className="text-foreground">Global accessibility with multi-language support</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Shield className="h-5 w-5 text-primary" />
                    <span className="text-foreground">Enterprise-grade security and privacy</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Zap className="h-5 w-5 text-primary" />
                    <span className="text-foreground">Real-time responses with minimal latency</span>
                  </div>
                </div>
              </div>
              <div className="relative">
                <Card className="p-8 border-border/40 backdrop-blur-sm bg-card/80">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-muted-foreground">Online</span>
                      </div>
                      <Badge variant="secondary">AI Assistant</Badge>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4">
                      <p className="text-sm text-muted-foreground">Hello! How can I help you today?</p>
                    </div>
                    <div className="bg-primary/10 rounded-lg p-4 ml-8">
                      <p className="text-sm">Can you help me write a Python function?</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4">
                      <p className="text-sm text-muted-foreground">
                        Absolutely! I'd be happy to help you write a Python function. 
                        What would you like the function to do?
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section id="testimonials" className="py-20 px-4">
          <div className="container mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-foreground mb-4">
                Loved by Thousands
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                See what our users have to say about their experience with ErzenAI.
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
              {testimonials.map((testimonial, index) => (
                <Card key={index} className="border-border/40 backdrop-blur-sm bg-card/80">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">{testimonial.name}</CardTitle>
                        <CardDescription>{testimonial.role}</CardDescription>
                      </div>
                      <div className="flex">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">
                      "{testimonial.content}"
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-20 px-4">
          <div className="container mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-foreground mb-4">
                Choose Your Plan
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Start free and scale as you grow. All plans include access to our powerful AI models.
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {pricingPlans.map((plan, index) => (
                <Card 
                  key={index} 
                  className={`relative p-8 border-border/40 backdrop-blur-sm bg-card/80 ${
                    plan.popular ? 'ring-2 ring-primary/50 shadow-xl scale-105' : ''
                  } ${!plan.available ? 'opacity-90' : ''}`}
                >
                  {plan.popular && (
                    <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground">
                      Most Popular
                    </Badge>
                  )}
                  
                  <CardHeader className="text-center pb-8">
                    <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                    <div className="mt-4">
                      <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                      <span className="text-muted-foreground">/{plan.period}</span>
                    </div>
                    <CardDescription className="text-base mt-2">
                      {plan.description}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      {plan.features.map((feature, featureIndex) => (
                        <div key={featureIndex} className="flex items-center space-x-3">
                          <Check className="h-4 w-4 text-primary flex-shrink-0" />
                          <span className="text-sm text-muted-foreground">{feature}</span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="pt-6">
                      <Button 
                        className={`w-full ${plan.popular ? 'bg-primary hover:bg-primary/90' : ''}`}
                        variant={plan.popular ? 'default' : 'outline'}
                        onClick={plan.available ? handleGetStarted : undefined}
                        disabled={!plan.available}
                      >
                        {!plan.available && <Clock className="h-4 w-4 mr-2" />}
                        {plan.buttonText}
                      </Button>
                    </div>
                    
                    {!plan.available && (
                      <p className="text-xs text-muted-foreground text-center pt-2">
                        Get notified when this plan becomes available
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <div className="text-center mt-12">
              <p className="text-sm text-muted-foreground">
                All plans include secure conversations, multiple AI models, and real-time streaming.
                <br />
                Credits reset monthly. No hidden fees or long-term commitments.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4">
          <div className="container mx-auto">
            <Card className="text-center p-12 border-border/40 backdrop-blur-sm bg-gradient-to-r from-primary/5 to-accent/5">
              <CardHeader>
                <CardTitle className="text-4xl font-bold text-foreground mb-4">
                  Ready to Get Started?
                </CardTitle>
                <CardDescription className="text-xl max-w-2xl mx-auto">
                  Join thousands of users who are already experiencing the future of AI conversations.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <Button size="lg" onClick={handleGetStarted} className="group">
                  Start Your Journey
                  <Sparkles className="h-5 w-5 ml-2 group-hover:scale-110 transition-transform" />
                </Button>
                <p className="text-sm text-muted-foreground mt-4">
                  No credit card required • Free to start • Instant access
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border/40 backdrop-blur-sm py-12 px-4">
          <div className="container mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="flex items-center space-x-2 mb-4 md:mb-0">
                <Brain className="h-6 w-6 text-primary" />
                <span className="text-lg font-semibold text-foreground">ErzenAI</span>
              </div>
              <div className="text-center md:text-right">
                <p className="text-muted-foreground">
                  © 2024 ErzenAI. Built with ❤️ for the future of AI.
                </p>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
} 