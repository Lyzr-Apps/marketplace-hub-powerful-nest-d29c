'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { FiSearch, FiTag, FiDollarSign, FiMapPin, FiMessageSquare, FiUser, FiPlus, FiTrash2, FiEdit, FiCheck, FiX, FiChevronRight, FiGrid, FiList, FiHeart, FiShare2, FiStar, FiCamera, FiSend, FiHome, FiShoppingBag, FiPackage, FiFilter, FiArrowLeft, FiClock, FiImage } from 'react-icons/fi'
import { HiSparkles } from 'react-icons/hi2'
import { BsLightningChargeFill } from 'react-icons/bs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'

// ─── Agent IDs ───
const LISTING_AGENT_ID = '69996083a4f57aa46126cbd2'
const BUYER_AGENT_ID = '69996084c066ed107671ac0b'

// ─── Types ───
interface Listing {
  id: string
  title: string
  price: number
  category: string
  condition: string
  location: string
  imageColor: string
  seller: string
  sellerRating: number
  description: string
  highlights: string[]
  keywords: string[]
  status: 'active' | 'sold' | 'draft'
  createdAt: string
  enhanced: boolean
}

interface ListingAgentResponse {
  enhanced_title?: string
  description?: string
  highlights?: string[]
  keywords?: string[]
}

interface BuyerAgentResponse {
  interpreted_query?: string
  filters?: {
    category?: string
    min_price?: number
    max_price?: number
    condition?: string
    keywords?: string[]
  }
  suggestions?: string[]
  summary?: string
}

interface Message {
  id: string
  senderId: string
  text: string
  timestamp: string
}

interface Conversation {
  id: string
  participantName: string
  listingTitle: string
  listingPrice: number
  listingImageColor: string
  lastMessage: string
  lastMessageTime: string
  unread: number
  messages: Message[]
}

type ScreenType = 'home' | 'browse' | 'sell' | 'messages' | 'mylistings' | 'detail'

// ─── Mock Data ───
const CATEGORIES = [
  { name: 'Electronics', icon: 'electronics', color: 'hsl(27, 61%, 26%)' },
  { name: 'Furniture', icon: 'furniture', color: 'hsl(43, 75%, 38%)' },
  { name: 'Clothing', icon: 'clothing', color: 'hsl(30, 55%, 25%)' },
  { name: 'Books', icon: 'books', color: 'hsl(35, 45%, 42%)' },
  { name: 'Sports', icon: 'sports', color: 'hsl(20, 65%, 35%)' },
  { name: 'Kitchen', icon: 'kitchen', color: 'hsl(27, 50%, 30%)' },
  { name: 'Home Decor', icon: 'homedecor', color: 'hsl(43, 60%, 32%)' },
  { name: 'Others', icon: 'others', color: 'hsl(30, 30%, 40%)' },
]

const INITIAL_LISTINGS: Listing[] = [
  { id: '1', title: 'Vintage Leather Armchair', price: 245, category: 'Furniture', condition: 'Good', location: 'Portland, OR', imageColor: 'hsl(27, 61%, 26%)', seller: 'Margaret W.', sellerRating: 4.8, description: 'Beautiful vintage leather armchair with solid oak frame. Minor wear consistent with age. Perfect for a reading nook or study.', highlights: ['Genuine leather upholstery', 'Solid oak frame', 'Classic mid-century design'], keywords: ['vintage', 'leather', 'armchair', 'furniture'], status: 'active', createdAt: '2025-02-18', enhanced: true },
  { id: '2', title: 'Canon EOS R6 Camera Body', price: 1200, category: 'Electronics', condition: 'Like New', location: 'Seattle, WA', imageColor: 'hsl(30, 22%, 14%)', seller: 'James K.', sellerRating: 4.9, description: 'Barely used Canon EOS R6 mirrorless camera body. Shutter count under 2000. Comes with original box and accessories.', highlights: ['Low shutter count', 'Includes original packaging', 'Full-frame mirrorless'], keywords: ['canon', 'camera', 'mirrorless', 'photography'], status: 'active', createdAt: '2025-02-19', enhanced: true },
  { id: '3', title: 'Handwoven Persian Rug 5x8', price: 380, category: 'Home Decor', condition: 'Good', location: 'Austin, TX', imageColor: 'hsl(0, 45%, 35%)', seller: 'Sarah M.', sellerRating: 4.6, description: 'Authentic handwoven Persian rug. Rich colors with traditional medallion pattern. Some light fading adds character.', highlights: ['Handwoven authenticity', 'Traditional medallion pattern', '5x8 feet dimensions'], keywords: ['persian', 'rug', 'handwoven', 'decor'], status: 'active', createdAt: '2025-02-17', enhanced: true },
  { id: '4', title: 'Le Creuset Dutch Oven 5.5qt', price: 165, category: 'Kitchen', condition: 'Like New', location: 'Denver, CO', imageColor: 'hsl(15, 65%, 42%)', seller: 'Thomas R.', sellerRating: 4.7, description: 'Le Creuset signature round dutch oven in Flame color. Used only a handful of times. No chips or cracks.', highlights: ['Signature Flame color', 'Cast iron enameled', '5.5 quart capacity'], keywords: ['le creuset', 'dutch oven', 'cast iron', 'cookware'], status: 'active', createdAt: '2025-02-20', enhanced: false },
  { id: '5', title: 'Brooks Brothers Navy Blazer 42R', price: 95, category: 'Clothing', condition: 'Good', location: 'Chicago, IL', imageColor: 'hsl(220, 40%, 25%)', seller: 'David P.', sellerRating: 4.5, description: 'Classic Brooks Brothers navy blazer, size 42R. Gold buttons, half-lined. Perfect for office or casual wear.', highlights: ['Gold button detailing', 'Half-lined construction', 'Size 42R'], keywords: ['brooks brothers', 'blazer', 'navy', 'menswear'], status: 'active', createdAt: '2025-02-16', enhanced: false },
  { id: '6', title: 'First Edition Hemingway Collection', price: 450, category: 'Books', condition: 'Fair', location: 'New York, NY', imageColor: 'hsl(35, 45%, 42%)', seller: 'Eleanor V.', sellerRating: 5.0, description: 'Collection of 4 first edition Hemingway novels. Some foxing on pages but bindings are intact. Rare find for collectors.', highlights: ['First edition prints', '4 novels included', 'Collector grade'], keywords: ['hemingway', 'first edition', 'rare books', 'collectible'], status: 'active', createdAt: '2025-02-15', enhanced: true },
  { id: '7', title: 'Trek Domane Road Bike', price: 890, category: 'Sports', condition: 'Good', location: 'San Francisco, CA', imageColor: 'hsl(200, 50%, 35%)', seller: 'Michael C.', sellerRating: 4.4, description: 'Trek Domane AL 3 road bike, 56cm frame. Shimano Claris groupset. Recently tuned up with new brake pads and tires.', highlights: ['Shimano Claris groupset', '56cm aluminum frame', 'Recently serviced'], keywords: ['trek', 'road bike', 'cycling', 'shimano'], status: 'active', createdAt: '2025-02-14', enhanced: true },
  { id: '8', title: 'Sonos One Smart Speaker Pair', price: 280, category: 'Electronics', condition: 'Like New', location: 'Nashville, TN', imageColor: 'hsl(0, 0%, 20%)', seller: 'Lisa H.', sellerRating: 4.8, description: 'Pair of Sonos One (Gen 2) smart speakers in black. Both in perfect working condition. Includes power cables.', highlights: ['Stereo pair setup', 'Gen 2 model', 'Built-in Alexa'], keywords: ['sonos', 'speaker', 'smart home', 'audio'], status: 'active', createdAt: '2025-02-13', enhanced: false },
]

const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv1', participantName: 'Margaret W.', listingTitle: 'Vintage Leather Armchair', listingPrice: 245, listingImageColor: 'hsl(27, 61%, 26%)', lastMessage: 'Would you accept $220?', lastMessageTime: '2:30 PM', unread: 2,
    messages: [
      { id: 'm1', senderId: 'them', text: 'Hi! Is the armchair still available?', timestamp: '2:15 PM' },
      { id: 'm2', senderId: 'me', text: 'Yes, it is! Would you like to come see it?', timestamp: '2:20 PM' },
      { id: 'm3', senderId: 'them', text: 'Definitely interested. Is the leather in good condition?', timestamp: '2:25 PM' },
      { id: 'm4', senderId: 'them', text: 'Would you accept $220?', timestamp: '2:30 PM' },
    ],
  },
  {
    id: 'conv2', participantName: 'James K.', listingTitle: 'Canon EOS R6 Camera Body', listingPrice: 1200, listingImageColor: 'hsl(30, 22%, 14%)', lastMessage: 'Can you send more photos?', lastMessageTime: '11:45 AM', unread: 1,
    messages: [
      { id: 'm5', senderId: 'them', text: 'Hello, I saw your camera listing.', timestamp: '11:30 AM' },
      { id: 'm6', senderId: 'me', text: 'Hi James! Yes, the R6 is available.', timestamp: '11:35 AM' },
      { id: 'm7', senderId: 'them', text: 'Can you send more photos?', timestamp: '11:45 AM' },
    ],
  },
  {
    id: 'conv3', participantName: 'Sarah M.', listingTitle: 'Handwoven Persian Rug 5x8', listingPrice: 380, listingImageColor: 'hsl(0, 45%, 35%)', lastMessage: 'Thanks, I will think about it!', lastMessageTime: 'Yesterday', unread: 0,
    messages: [
      { id: 'm8', senderId: 'them', text: 'What are the exact dimensions?', timestamp: 'Yesterday' },
      { id: 'm9', senderId: 'me', text: "It's 5 feet by 8 feet exactly.", timestamp: 'Yesterday' },
      { id: 'm10', senderId: 'them', text: 'Thanks, I will think about it!', timestamp: 'Yesterday' },
    ],
  },
  {
    id: 'conv4', participantName: 'Thomas R.', listingTitle: 'Le Creuset Dutch Oven 5.5qt', listingPrice: 165, listingImageColor: 'hsl(15, 65%, 42%)', lastMessage: 'I can pick it up Saturday', lastMessageTime: 'Monday', unread: 0,
    messages: [
      { id: 'm11', senderId: 'them', text: 'Is this the Flame color?', timestamp: 'Monday' },
      { id: 'm12', senderId: 'me', text: 'Yes, Flame (orange-red). It is beautiful.', timestamp: 'Monday' },
      { id: 'm13', senderId: 'them', text: 'I can pick it up Saturday', timestamp: 'Monday' },
    ],
  },
]

// ─── Helpers ───
function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### ')) return <h4 key={i} className="font-semibold text-sm mt-3 mb-1">{line.slice(4)}</h4>
        if (line.startsWith('## ')) return <h3 key={i} className="font-semibold text-base mt-3 mb-1">{line.slice(3)}</h3>
        if (line.startsWith('# ')) return <h2 key={i} className="font-bold text-lg mt-4 mb-2">{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-4 list-disc text-sm">{formatInline(line.slice(2))}</li>
        if (/^\d+\.\s/.test(line)) return <li key={i} className="ml-4 list-decimal text-sm">{formatInline(line.replace(/^\d+\.\s/, ''))}</li>
        if (!line.trim()) return <div key={i} className="h-1" />
        return <p key={i} className="text-sm">{formatInline(line)}</p>
      })}
    </div>
  )
}

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) => i % 2 === 1 ? <strong key={i} className="font-semibold">{part}</strong> : part)
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9)
}

function getCategoryIcon(cat: string) {
  switch (cat) {
    case 'Electronics': return <FiPackage className="w-5 h-5" />
    case 'Furniture': return <FiHome className="w-5 h-5" />
    case 'Clothing': return <FiShoppingBag className="w-5 h-5" />
    case 'Books': return <FiTag className="w-5 h-5" />
    case 'Sports': return <FiStar className="w-5 h-5" />
    case 'Kitchen': return <FiGrid className="w-5 h-5" />
    case 'Home Decor': return <FiHeart className="w-5 h-5" />
    default: return <FiList className="w-5 h-5" />
  }
}

function conditionColor(condition: string) {
  switch (condition) {
    case 'New': return 'bg-green-100 text-green-800 border-green-300'
    case 'Like New': return 'bg-blue-100 text-blue-800 border-blue-300'
    case 'Good': return 'bg-amber-100 text-amber-800 border-amber-300'
    case 'Fair': return 'bg-orange-100 text-orange-800 border-orange-300'
    default: return 'bg-gray-100 text-gray-800 border-gray-300'
  }
}

// ─── Error Boundary ───
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4 text-sm">{this.state.error}</p>
            <button onClick={() => this.setState({ hasError: false, error: '' })} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">Try again</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ─── Sub-Components ───

function NavBar({ activeScreen, setActiveScreen, unreadCount }: { activeScreen: ScreenType; setActiveScreen: (s: ScreenType) => void; unreadCount: number }) {
  const navItems: { key: ScreenType; label: string; icon: React.ReactNode }[] = [
    { key: 'home', label: 'Home', icon: <FiHome className="w-4 h-4" /> },
    { key: 'browse', label: 'Browse', icon: <FiSearch className="w-4 h-4" /> },
    { key: 'sell', label: 'Sell', icon: <FiPlus className="w-4 h-4" /> },
    { key: 'messages', label: 'Messages', icon: <FiMessageSquare className="w-4 h-4" /> },
    { key: 'mylistings', label: 'My Listings', icon: <FiPackage className="w-4 h-4" /> },
  ]
  return (
    <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-primary/20 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <button onClick={() => setActiveScreen('home')} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <FiShoppingBag className="w-6 h-6 text-primary" />
            <span className="text-xl font-serif font-bold text-primary">SecondHand</span>
          </button>
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <button key={item.key} onClick={() => setActiveScreen(item.key)} className={`relative flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${activeScreen === item.key ? 'bg-primary text-primary-foreground shadow-sm' : 'text-foreground/70 hover:text-foreground hover:bg-secondary'}`}>
                {item.icon}
                <span>{item.label}</span>
                {item.key === 'messages' && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">{unreadCount}</span>
                )}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
              <FiUser className="w-4 h-4 text-primary" />
            </div>
          </div>
        </div>
        {/* Mobile nav */}
        <div className="md:hidden flex items-center justify-around py-2 border-t border-primary/10">
          {navItems.map((item) => (
            <button key={item.key} onClick={() => setActiveScreen(item.key)} className={`relative flex flex-col items-center gap-0.5 px-2 py-1 rounded text-xs transition-all ${activeScreen === item.key ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
              {item.icon}
              <span>{item.label}</span>
              {item.key === 'messages' && unreadCount > 0 && (
                <span className="absolute -top-1 right-0 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] rounded-full flex items-center justify-center">{unreadCount}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </header>
  )
}

function ProductCard({ listing, onClick, onFavorite, isFavorited }: { listing: Listing; onClick: () => void; onFavorite: () => void; isFavorited: boolean }) {
  return (
    <Card className="group overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 border-primary/15 bg-card" onClick={onClick}>
      <div className="relative aspect-[4/3] flex items-center justify-center" style={{ backgroundColor: listing.imageColor }}>
        <FiImage className="w-12 h-12 text-white/40" />
        <button onClick={(e) => { e.stopPropagation(); onFavorite() }} className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all ${isFavorited ? 'bg-red-500 text-white' : 'bg-white/80 text-foreground/60 hover:bg-white hover:text-red-500'}`}>
          <FiHeart className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
        </button>
        {listing.enhanced && (
          <div className="absolute top-3 left-3 bg-accent text-accent-foreground px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1">
            <HiSparkles className="w-3 h-3" /> AI Enhanced
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <h3 className="font-serif font-semibold text-foreground truncate mb-1">{listing.title}</h3>
        <p className="text-lg font-bold text-primary mb-2">${listing.price}</p>
        <div className="flex items-center justify-between gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full border ${conditionColor(listing.condition)}`}>{listing.condition}</span>
          <span className="text-xs text-muted-foreground flex items-center gap-1"><FiMapPin className="w-3 h-3" />{listing.location}</span>
        </div>
      </CardContent>
    </Card>
  )
}

function SkeletonCard() {
  return (
    <Card className="overflow-hidden border-primary/15">
      <Skeleton className="aspect-[4/3] w-full" />
      <CardContent className="p-4 space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-6 w-1/3" />
        <div className="flex justify-between">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Screen: Home ───
function HomeScreen({ setActiveScreen, listings, favorites, toggleFavorite, setSelectedListing, setSearchQuery }: { setActiveScreen: (s: ScreenType) => void; listings: Listing[]; favorites: Set<string>; toggleFavorite: (id: string) => void; setSelectedListing: (l: Listing) => void; setSearchQuery: (q: string) => void }) {
  const [heroSearch, setHeroSearch] = useState('')
  const activeListings = listings.filter(l => l.status === 'active')

  return (
    <div className="space-y-12 pb-16">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-primary/10 via-card to-accent/5 py-16 sm:py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="font-serif text-4xl sm:text-5xl font-bold text-foreground mb-4 leading-tight">Buy & Sell Pre-Loved Items</h1>
          <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">Discover unique treasures or give your belongings a second life. Quality goods, fair prices, trusted community.</p>
          <div className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto mb-8">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search for anything..." value={heroSearch} onChange={(e) => setHeroSearch(e.target.value)} className="pl-10 bg-background border-primary/20 h-12" onKeyDown={(e) => { if (e.key === 'Enter' && heroSearch.trim()) { setSearchQuery(heroSearch); setActiveScreen('browse') } }} />
            </div>
            <Button onClick={() => { if (heroSearch.trim()) { setSearchQuery(heroSearch); setActiveScreen('browse') } }} className="h-12 px-6 bg-primary text-primary-foreground hover:bg-primary/90">
              <FiSearch className="w-4 h-4 mr-2" /> Search
            </Button>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Button onClick={() => setActiveScreen('sell')} className="bg-primary text-primary-foreground hover:bg-primary/90 px-6">
              <FiPlus className="w-4 h-4 mr-2" /> Start Selling
            </Button>
            <Button onClick={() => setActiveScreen('browse')} variant="outline" className="border-primary/30 text-foreground hover:bg-secondary px-6">
              <FiSearch className="w-4 h-4 mr-2" /> Browse Items
            </Button>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-6xl mx-auto px-4">
        <h2 className="font-serif text-2xl font-bold text-foreground mb-6">Shop by Category</h2>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
          {CATEGORIES.map((cat) => (
            <button key={cat.name} onClick={() => { setSearchQuery(cat.name); setActiveScreen('browse') }} className="flex flex-col items-center gap-2 p-3 rounded-lg bg-card border border-primary/10 hover:border-primary/30 hover:shadow-md transition-all duration-200 group">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                {getCategoryIcon(cat.name)}
              </div>
              <span className="text-xs font-medium text-foreground/80 text-center leading-tight">{cat.name}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Recently Listed */}
      <section className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif text-2xl font-bold text-foreground">Recently Listed</h2>
          <Button variant="ghost" onClick={() => setActiveScreen('browse')} className="text-primary hover:text-primary/80">
            View All <FiChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {activeListings.slice(0, 8).map((listing) => (
            <ProductCard key={listing.id} listing={listing} onClick={() => { setSelectedListing(listing); setActiveScreen('detail') }} onFavorite={() => toggleFavorite(listing.id)} isFavorited={favorites.has(listing.id)} />
          ))}
        </div>
      </section>
    </div>
  )
}

// ─── Screen: Browse & Search ───
function BrowseScreen({ listings, favorites, toggleFavorite, setSelectedListing, setActiveScreen, initialQuery }: { listings: Listing[]; favorites: Set<string>; toggleFavorite: (id: string) => void; setSelectedListing: (l: Listing) => void; setActiveScreen: (s: ScreenType) => void; initialQuery: string }) {
  const [searchQuery, setSearchQuery] = useState(initialQuery)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<BuyerAgentResponse | null>(null)
  const [aiError, setAiError] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [selectedCondition, setSelectedCondition] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showFilters, setShowFilters] = useState(false)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)

  const handleSmartSearch = useCallback(async () => {
    if (!searchQuery.trim()) return
    setAiLoading(true)
    setAiError('')
    setAiResult(null)
    setActiveAgentId(BUYER_AGENT_ID)
    try {
      const result = await callAIAgent(searchQuery, BUYER_AGENT_ID)
      if (result?.success && result?.response?.result) {
        const data = result.response.result as BuyerAgentResponse
        setAiResult(data)
        if (data?.filters?.category) {
          setSelectedCategories(new Set([data.filters.category]))
        }
        if (data?.filters?.min_price != null) setMinPrice(String(data.filters.min_price))
        if (data?.filters?.max_price != null) setMaxPrice(String(data.filters.max_price))
        if (data?.filters?.condition) setSelectedCondition(data.filters.condition)
      } else {
        setAiError('Could not interpret your search. Try different keywords.')
      }
    } catch {
      setAiError('Search failed. Please try again.')
    } finally {
      setAiLoading(false)
      setActiveAgentId(null)
    }
  }, [searchQuery])

  const filteredListings = useMemo(() => {
    let items = listings.filter(l => l.status === 'active')
    if (selectedCategories.size > 0) items = items.filter(l => selectedCategories.has(l.category))
    if (minPrice) items = items.filter(l => l.price >= Number(minPrice))
    if (maxPrice) items = items.filter(l => l.price <= Number(maxPrice))
    if (selectedCondition) items = items.filter(l => l.condition === selectedCondition)
    if (searchQuery.trim() && !aiResult) {
      const q = searchQuery.toLowerCase()
      items = items.filter(l => l.title.toLowerCase().includes(q) || l.category.toLowerCase().includes(q) || l.description.toLowerCase().includes(q) || (Array.isArray(l.keywords) && l.keywords.some(k => k.toLowerCase().includes(q))))
    }
    switch (sortBy) {
      case 'price-low': items.sort((a, b) => a.price - b.price); break
      case 'price-high': items.sort((a, b) => b.price - a.price); break
      default: break
    }
    return items
  }, [listings, selectedCategories, minPrice, maxPrice, selectedCondition, searchQuery, sortBy, aiResult])

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat); else next.add(cat)
      return next
    })
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search items or describe what you need..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 bg-background border-primary/20 h-11" onKeyDown={(e) => { if (e.key === 'Enter') handleSmartSearch() }} />
        </div>
        <Button onClick={handleSmartSearch} disabled={aiLoading || !searchQuery.trim()} className="h-11 px-5 bg-accent text-accent-foreground hover:bg-accent/90">
          {aiLoading ? <span className="w-4 h-4 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin mr-2" /> : <BsLightningChargeFill className="w-4 h-4 mr-2" />}
          Smart Search
        </Button>
        <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="h-11 md:hidden border-primary/20">
          <FiFilter className="w-4 h-4 mr-2" /> Filters
        </Button>
      </div>

      {/* AI Result Panel */}
      {aiLoading && (
        <Card className="border-accent/30 bg-accent/5">
          <CardContent className="p-4 flex items-center gap-3">
            <span className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground">AI is analyzing your search...</span>
          </CardContent>
        </Card>
      )}
      {aiError && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 text-sm text-destructive">{aiError}</CardContent>
        </Card>
      )}
      {aiResult && !aiLoading && (
        <Card className="border-accent/30 bg-gradient-to-r from-accent/5 to-transparent">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <HiSparkles className="w-5 h-5 text-accent" />
              <span className="font-serif font-semibold text-foreground">AI Search Insights</span>
            </div>
            {aiResult?.interpreted_query && (
              <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">Understood as:</span> {aiResult.interpreted_query}</p>
            )}
            {aiResult?.summary && (
              <div className="text-sm">{renderMarkdown(aiResult.summary)}</div>
            )}
            {aiResult?.filters && (
              <div className="flex flex-wrap gap-2">
                {aiResult.filters.category && <Badge variant="secondary" className="text-xs"><FiTag className="w-3 h-3 mr-1" />{aiResult.filters.category}</Badge>}
                {aiResult.filters.condition && <Badge variant="secondary" className="text-xs">{aiResult.filters.condition}</Badge>}
                {(aiResult.filters.min_price != null || aiResult.filters.max_price != null) && <Badge variant="secondary" className="text-xs"><FiDollarSign className="w-3 h-3 mr-1" />{aiResult.filters.min_price ?? 0} - {aiResult.filters.max_price ?? 'any'}</Badge>}
                {Array.isArray(aiResult.filters.keywords) && aiResult.filters.keywords.map((kw, i) => <Badge key={i} variant="outline" className="text-xs">{kw}</Badge>)}
              </div>
            )}
            {Array.isArray(aiResult?.suggestions) && aiResult.suggestions.length > 0 && (
              <div>
                <span className="text-xs font-medium text-muted-foreground">Suggestions:</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {aiResult.suggestions.map((s, i) => (
                    <button key={i} onClick={() => { setSearchQuery(s); handleSmartSearch() }} className="text-xs px-3 py-1 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">{s}</button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex gap-6">
        {/* Filters Panel */}
        <aside className={`${showFilters ? 'block' : 'hidden'} md:block w-full md:w-60 shrink-0 space-y-5`}>
          <Card className="border-primary/10 bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-serif">Categories</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {CATEGORIES.map((cat) => (
                <label key={cat.name} className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="checkbox" checked={selectedCategories.has(cat.name)} onChange={() => toggleCategory(cat.name)} className="rounded border-primary/30 text-primary focus:ring-primary" />
                  <span className="text-foreground/80">{cat.name}</span>
                </label>
              ))}
            </CardContent>
          </Card>
          <Card className="border-primary/10 bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-serif">Price Range</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2 items-center">
                <div className="relative flex-1">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                  <Input type="number" placeholder="Min" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} className="pl-6 h-9 text-sm" />
                </div>
                <span className="text-muted-foreground text-xs">to</span>
                <div className="relative flex-1">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                  <Input type="number" placeholder="Max" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="pl-6 h-9 text-sm" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-primary/10 bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-serif">Condition</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {['', 'New', 'Like New', 'Good', 'Fair'].map((c) => (
                <label key={c || 'all'} className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="radio" name="condition" checked={selectedCondition === c} onChange={() => setSelectedCondition(c)} className="text-primary focus:ring-primary" />
                  <span className="text-foreground/80">{c || 'All Conditions'}</span>
                </label>
              ))}
            </CardContent>
          </Card>
          <Button variant="ghost" onClick={() => { setSelectedCategories(new Set()); setMinPrice(''); setMaxPrice(''); setSelectedCondition(''); setAiResult(null); setSearchQuery('') }} className="w-full text-sm text-muted-foreground hover:text-foreground">
            <FiX className="w-3 h-3 mr-1" /> Clear All Filters
          </Button>
        </aside>

        {/* Results */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{filteredListings.length} item{filteredListings.length !== 1 ? 's' : ''} found</p>
            <div className="flex items-center gap-2">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40 h-9 text-sm border-primary/20">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                </SelectContent>
              </Select>
              <div className="hidden sm:flex items-center border border-primary/15 rounded-md overflow-hidden">
                <button onClick={() => setViewMode('grid')} className={`p-2 ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}><FiGrid className="w-4 h-4" /></button>
                <button onClick={() => setViewMode('list')} className={`p-2 ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}><FiList className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
          {filteredListings.length === 0 ? (
            <Card className="border-primary/10 bg-card">
              <CardContent className="py-16 text-center">
                <FiSearch className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="font-serif text-lg font-semibold text-foreground mb-2">No items found</h3>
                <p className="text-sm text-muted-foreground mb-4">Try adjusting your filters or search for something different.</p>
                <Button variant="outline" onClick={() => { setSelectedCategories(new Set()); setMinPrice(''); setMaxPrice(''); setSelectedCondition(''); setSearchQuery(''); setAiResult(null) }} className="border-primary/20">Clear Filters</Button>
              </CardContent>
            </Card>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredListings.map((listing) => (
                <ProductCard key={listing.id} listing={listing} onClick={() => { setSelectedListing(listing); setActiveScreen('detail') }} onFavorite={() => toggleFavorite(listing.id)} isFavorited={favorites.has(listing.id)} />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredListings.map((listing) => (
                <Card key={listing.id} className="overflow-hidden border-primary/10 cursor-pointer hover:shadow-md transition-all" onClick={() => { setSelectedListing(listing); setActiveScreen('detail') }}>
                  <div className="flex">
                    <div className="w-32 h-28 shrink-0 flex items-center justify-center" style={{ backgroundColor: listing.imageColor }}>
                      <FiImage className="w-8 h-8 text-white/40" />
                    </div>
                    <CardContent className="p-3 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-serif font-semibold text-foreground text-sm truncate">{listing.title}</h3>
                        <p className="text-base font-bold text-primary">${listing.price}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${conditionColor(listing.condition)}`}>{listing.condition}</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><FiMapPin className="w-3 h-3" />{listing.location}</span>
                      </div>
                    </CardContent>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Agent info */}
      <Card className="border-primary/10 bg-card/50 mt-8">
        <CardContent className="p-4 flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${activeAgentId ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground/30'}`} />
          <span className="text-xs text-muted-foreground">
            <span className="font-medium">Buyer Discovery Agent</span> {activeAgentId ? '- Processing...' : '- Ready'}
          </span>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Screen: Create/Edit Listing ───
function SellScreen({ onPublish, setActiveScreen }: { onPublish: (listing: Listing) => void; setActiveScreen: (s: ScreenType) => void }) {
  const [formData, setFormData] = useState({
    title: '',
    price: '',
    category: '',
    condition: '',
    notes: '',
  })
  const [photoSlots, setPhotoSlots] = useState<string[]>([])
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<ListingAgentResponse | null>(null)
  const [aiError, setAiError] = useState('')
  const [editedDescription, setEditedDescription] = useState('')
  const [editedTitle, setEditedTitle] = useState('')
  const [publishSuccess, setPublishSuccess] = useState(false)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)

  const handleEnhance = useCallback(async () => {
    if (!formData.title.trim() && !formData.notes.trim()) return
    setAiLoading(true)
    setAiError('')
    setAiResult(null)
    setActiveAgentId(LISTING_AGENT_ID)
    try {
      const message = `Create an enhanced listing for the following item: Title: "${formData.title}". Category: ${formData.category || 'General'}. Condition: ${formData.condition || 'Good'}. Price: $${formData.price || 'Not set'}. Additional notes: ${formData.notes || 'None provided'}.`
      const result = await callAIAgent(message, LISTING_AGENT_ID)
      if (result?.success && result?.response?.result) {
        const data = result.response.result as ListingAgentResponse
        setAiResult(data)
        setEditedTitle(data?.enhanced_title ?? formData.title)
        setEditedDescription(data?.description ?? '')
      } else {
        setAiError('Could not enhance your listing. Please try again.')
      }
    } catch {
      setAiError('Enhancement failed. Please try again.')
    } finally {
      setAiLoading(false)
      setActiveAgentId(null)
    }
  }, [formData])

  const handlePublish = () => {
    const imageColors = ['hsl(27, 61%, 26%)', 'hsl(43, 75%, 38%)', 'hsl(30, 55%, 25%)', 'hsl(35, 45%, 42%)', 'hsl(20, 65%, 35%)']
    const listing: Listing = {
      id: generateId(),
      title: editedTitle || formData.title || 'Untitled Item',
      price: Number(formData.price) || 0,
      category: formData.category || 'Others',
      condition: formData.condition || 'Good',
      location: 'My Location',
      imageColor: imageColors[Math.floor(Math.random() * imageColors.length)],
      seller: 'You',
      sellerRating: 5.0,
      description: editedDescription || aiResult?.description || formData.notes || '',
      highlights: Array.isArray(aiResult?.highlights) ? aiResult.highlights : [],
      keywords: Array.isArray(aiResult?.keywords) ? aiResult.keywords : [],
      status: 'active',
      createdAt: new Date().toISOString().split('T')[0],
      enhanced: !!aiResult,
    }
    onPublish(listing)
    setPublishSuccess(true)
    setTimeout(() => {
      setPublishSuccess(false)
      setFormData({ title: '', price: '', category: '', condition: '', notes: '' })
      setAiResult(null)
      setEditedDescription('')
      setEditedTitle('')
      setActiveScreen('mylistings')
    }, 1500)
  }

  const canPublish = formData.title.trim() || editedTitle.trim()

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold text-foreground mb-2">Create Listing</h1>
        <p className="text-muted-foreground text-sm">Fill in the details and let AI enhance your listing for maximum visibility.</p>
      </div>

      {publishSuccess && (
        <Card className="border-green-300 bg-green-50">
          <CardContent className="p-4 flex items-center gap-3">
            <FiCheck className="w-5 h-5 text-green-600" />
            <span className="text-sm text-green-800 font-medium">Listing published successfully!</span>
          </CardContent>
        </Card>
      )}

      {/* Photo Upload Zone */}
      <Card className="border-primary/15 bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="font-serif text-lg">Photos</CardTitle>
          <CardDescription>Add up to 5 photos of your item</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-3">
            {[0, 1, 2, 3, 4].map((idx) => (
              <button key={idx} onClick={() => {
                if (!photoSlots.includes(String(idx))) {
                  setPhotoSlots(prev => [...prev, String(idx)])
                }
              }} className={`aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-all ${photoSlots.includes(String(idx)) ? 'border-primary/40 bg-primary/10' : 'border-primary/15 hover:border-primary/30 hover:bg-card'}`}>
                {photoSlots.includes(String(idx)) ? (
                  <FiCheck className="w-5 h-5 text-primary" />
                ) : (
                  <>
                    <FiCamera className="w-5 h-5 text-muted-foreground" />
                    {idx === 0 && <span className="text-[10px] text-muted-foreground">Main</span>}
                  </>
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Form Fields */}
      <Card className="border-primary/15 bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="font-serif text-lg">Item Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title" className="text-sm font-medium">Title</Label>
            <Input id="title" placeholder="What are you selling?" value={formData.title} onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))} className="mt-1 border-primary/20" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price" className="text-sm font-medium">Price</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <Input id="price" type="number" placeholder="0.00" value={formData.price} onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))} className="pl-7 border-primary/20" />
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Category</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}>
                <SelectTrigger className="mt-1 border-primary/20"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => <SelectItem key={cat.name} value={cat.name}>{cat.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium">Condition</Label>
            <Select value={formData.condition} onValueChange={(v) => setFormData(prev => ({ ...prev, condition: v }))}>
              <SelectTrigger className="mt-1 border-primary/20"><SelectValue placeholder="Select condition" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="New">New</SelectItem>
                <SelectItem value="Like New">Like New</SelectItem>
                <SelectItem value="Good">Good</SelectItem>
                <SelectItem value="Fair">Fair</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="notes" className="text-sm font-medium">Brief Notes</Label>
            <Textarea id="notes" placeholder="Describe your item - key features, condition details, why you are selling..." value={formData.notes} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} rows={4} className="mt-1 border-primary/20" />
          </div>
        </CardContent>
      </Card>

      {/* AI Enhance Button */}
      <Button onClick={handleEnhance} disabled={aiLoading || (!formData.title.trim() && !formData.notes.trim())} className="w-full h-12 bg-accent text-accent-foreground hover:bg-accent/90 font-medium text-base">
        {aiLoading ? (
          <><span className="w-4 h-4 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin mr-2" /> Enhancing with AI...</>
        ) : (
          <><HiSparkles className="w-5 h-5 mr-2" /> Enhance Listing with AI</>
        )}
      </Button>

      {aiError && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 text-sm text-destructive">{aiError}</CardContent>
        </Card>
      )}

      {/* AI Enhanced Preview */}
      {aiResult && !aiLoading && (
        <Card className="border-accent/30 bg-gradient-to-br from-accent/5 to-transparent">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <HiSparkles className="w-5 h-5 text-accent" />
              <CardTitle className="font-serif text-lg">AI-Enhanced Preview</CardTitle>
            </div>
            <CardDescription>Review and edit the AI-generated content</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Enhanced Title</Label>
              <Input value={editedTitle} onChange={(e) => setEditedTitle(e.target.value)} className="mt-1 border-accent/20 bg-background" />
            </div>
            <div>
              <Label className="text-sm font-medium">Description</Label>
              <Textarea value={editedDescription} onChange={(e) => setEditedDescription(e.target.value)} rows={5} className="mt-1 border-accent/20 bg-background" />
            </div>
            {Array.isArray(aiResult?.highlights) && aiResult.highlights.length > 0 && (
              <div>
                <Label className="text-sm font-medium mb-2 block">Highlights</Label>
                <ul className="space-y-1.5">
                  {aiResult.highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                      <FiCheck className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                      {h}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {Array.isArray(aiResult?.keywords) && aiResult.keywords.length > 0 && (
              <div>
                <Label className="text-sm font-medium mb-2 block">Keywords</Label>
                <div className="flex flex-wrap gap-2">
                  {aiResult.keywords.map((kw, i) => (
                    <Badge key={i} variant="secondary" className="text-xs"><FiTag className="w-3 h-3 mr-1" />{kw}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Publish Button */}
      <Button onClick={handlePublish} disabled={!canPublish || publishSuccess} className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-base">
        {publishSuccess ? <><FiCheck className="w-5 h-5 mr-2" /> Published!</> : 'Publish Listing'}
      </Button>

      {/* Agent Info */}
      <Card className="border-primary/10 bg-card/50">
        <CardContent className="p-4 flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${activeAgentId ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground/30'}`} />
          <span className="text-xs text-muted-foreground">
            <span className="font-medium">Listing Assistant Agent</span> {activeAgentId ? '- Enhancing...' : '- Ready'}
          </span>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Screen: Listing Detail ───
function DetailScreen({ listing, listings, setActiveScreen, setSelectedListing, favorites, toggleFavorite }: { listing: Listing; listings: Listing[]; setActiveScreen: (s: ScreenType) => void; setSelectedListing: (l: Listing) => void; favorites: Set<string>; toggleFavorite: (id: string) => void }) {
  const similarItems = useMemo(() => listings.filter(l => l.id !== listing.id && l.category === listing.category && l.status === 'active').slice(0, 4), [listings, listing])

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-8">
      <Button variant="ghost" onClick={() => setActiveScreen('browse')} className="text-muted-foreground hover:text-foreground">
        <FiArrowLeft className="w-4 h-4 mr-2" /> Back to Browse
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Image Gallery */}
        <div className="space-y-3">
          <div className="aspect-square rounded-lg flex items-center justify-center relative" style={{ backgroundColor: listing.imageColor }}>
            <FiImage className="w-20 h-20 text-white/30" />
            {listing.enhanced && (
              <div className="absolute top-4 left-4 bg-accent text-accent-foreground px-3 py-1 rounded text-sm font-medium flex items-center gap-1.5">
                <HiSparkles className="w-4 h-4" /> AI Enhanced
              </div>
            )}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="aspect-square rounded-md flex items-center justify-center opacity-60" style={{ backgroundColor: listing.imageColor }}>
                <FiImage className="w-6 h-6 text-white/30" />
              </div>
            ))}
          </div>
        </div>

        {/* Details */}
        <div className="space-y-5">
          <div>
            <div className="flex items-start justify-between gap-4">
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-foreground leading-tight">{listing.title}</h1>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => toggleFavorite(listing.id)} className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all ${favorites.has(listing.id) ? 'bg-red-50 border-red-200 text-red-500' : 'border-primary/15 text-muted-foreground hover:text-red-500'}`}>
                  <FiHeart className={`w-5 h-5 ${favorites.has(listing.id) ? 'fill-current' : ''}`} />
                </button>
                <button className="w-10 h-10 rounded-full border border-primary/15 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                  <FiShare2 className="w-5 h-5" />
                </button>
              </div>
            </div>
            <p className="text-3xl font-bold text-primary mt-2">${listing.price}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className={`text-sm px-3 py-1 rounded-full border ${conditionColor(listing.condition)}`}>{listing.condition}</span>
            <Badge variant="secondary"><FiTag className="w-3 h-3 mr-1" />{listing.category}</Badge>
            <Badge variant="outline" className="text-muted-foreground"><FiMapPin className="w-3 h-3 mr-1" />{listing.location}</Badge>
            <Badge variant="outline" className="text-muted-foreground"><FiClock className="w-3 h-3 mr-1" />{listing.createdAt}</Badge>
          </div>

          <Separator className="bg-primary/10" />

          <div>
            <h3 className="font-serif font-semibold text-foreground mb-2">Description</h3>
            <div className="text-sm text-foreground/80 leading-relaxed">{renderMarkdown(listing.description)}</div>
          </div>

          {Array.isArray(listing.highlights) && listing.highlights.length > 0 && (
            <div>
              <h3 className="font-serif font-semibold text-foreground mb-2">Highlights</h3>
              <ul className="space-y-2">
                {listing.highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                    <FiCheck className="w-4 h-4 text-accent mt-0.5 shrink-0" />{h}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {Array.isArray(listing.keywords) && listing.keywords.length > 0 && (
            <div>
              <h3 className="font-serif font-semibold text-foreground mb-2">Keywords</h3>
              <div className="flex flex-wrap gap-2">
                {listing.keywords.map((kw, i) => <Badge key={i} variant="secondary" className="text-xs">{kw}</Badge>)}
              </div>
            </div>
          )}

          <Separator className="bg-primary/10" />

          {/* Seller Card */}
          <Card className="border-primary/10 bg-card">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <FiUser className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">{listing.seller}</p>
                <div className="flex items-center gap-1">
                  <FiStar className="w-3 h-3 text-accent fill-current" />
                  <span className="text-sm text-muted-foreground">{listing.sellerRating} rating</span>
                </div>
              </div>
              <Button onClick={() => setActiveScreen('messages')} className="bg-primary text-primary-foreground hover:bg-primary/90">
                <FiMessageSquare className="w-4 h-4 mr-2" /> Message Seller
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Similar Items */}
      {similarItems.length > 0 && (
        <section>
          <h2 className="font-serif text-xl font-bold text-foreground mb-4">Similar Items</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {similarItems.map((item) => (
              <ProductCard key={item.id} listing={item} onClick={() => { setSelectedListing(item); window.scrollTo(0, 0) }} onFavorite={() => toggleFavorite(item.id)} isFavorited={favorites.has(item.id)} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

// ─── Screen: My Listings ───
function MyListingsScreen({ listings, setListings, setSelectedListing, setActiveScreen }: { listings: Listing[]; setListings: React.Dispatch<React.SetStateAction<Listing[]>>; setSelectedListing: (l: Listing) => void; setActiveScreen: (s: ScreenType) => void }) {
  const myListings = useMemo(() => listings.filter(l => l.seller === 'You'), [listings])
  const activeItems = myListings.filter(l => l.status === 'active')
  const soldItems = myListings.filter(l => l.status === 'sold')
  const draftItems = myListings.filter(l => l.status === 'draft')

  const markAsSold = (id: string) => {
    setListings(prev => prev.map(l => l.id === id ? { ...l, status: 'sold' as const } : l))
  }
  const deleteListing = (id: string) => {
    setListings(prev => prev.filter(l => l.id !== id))
  }

  function ListingRow({ item }: { item: Listing }) {
    return (
      <Card className="border-primary/10 bg-card overflow-hidden">
        <div className="flex items-center gap-4 p-4">
          <div className="w-16 h-16 rounded-md shrink-0 flex items-center justify-center" style={{ backgroundColor: item.imageColor }}>
            <FiImage className="w-6 h-6 text-white/40" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-serif font-semibold text-foreground truncate">{item.title}</h3>
            <p className="text-sm font-bold text-primary">${item.price}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs px-2 py-0.5 rounded-full border ${conditionColor(item.condition)}`}>{item.condition}</span>
              <span className="text-xs text-muted-foreground">{item.createdAt}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {item.status === 'active' && (
              <Button size="sm" variant="outline" onClick={() => markAsSold(item.id)} className="border-primary/20 text-xs">
                <FiCheck className="w-3 h-3 mr-1" /> Sold
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => { setSelectedListing(item); setActiveScreen('detail') }} className="border-primary/20 text-xs">
              <FiEdit className="w-3 h-3" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => deleteListing(item.id)} className="border-destructive/20 text-destructive hover:bg-destructive/10 text-xs">
              <FiTrash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  function EmptyTab({ message, cta }: { message: string; cta?: string }) {
    return (
      <div className="py-16 text-center">
        <FiPackage className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
        <p className="text-muted-foreground text-sm mb-4">{message}</p>
        {cta && <Button onClick={() => setActiveScreen('sell')} className="bg-primary text-primary-foreground hover:bg-primary/90">{cta}</Button>}
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold text-foreground mb-2">My Listings</h1>
        <p className="text-muted-foreground text-sm">Manage your items and track sales.</p>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="w-full bg-secondary">
          <TabsTrigger value="active" className="flex-1">Active ({activeItems.length})</TabsTrigger>
          <TabsTrigger value="sold" className="flex-1">Sold ({soldItems.length})</TabsTrigger>
          <TabsTrigger value="drafts" className="flex-1">Drafts ({draftItems.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="active" className="space-y-3 mt-4">
          {activeItems.length > 0 ? activeItems.map(item => <ListingRow key={item.id} item={item} />) : <EmptyTab message="No active listings yet." cta="Create Your First Listing" />}
        </TabsContent>
        <TabsContent value="sold" className="space-y-3 mt-4">
          {soldItems.length > 0 ? soldItems.map(item => <ListingRow key={item.id} item={item} />) : <EmptyTab message="No sold items yet. Keep listing!" />}
        </TabsContent>
        <TabsContent value="drafts" className="space-y-3 mt-4">
          {draftItems.length > 0 ? draftItems.map(item => <ListingRow key={item.id} item={item} />) : <EmptyTab message="No drafts saved." />}
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ─── Screen: Messages ───
function MessagesScreen({ conversations }: { conversations: Conversation[] }) {
  const [activeConvId, setActiveConvId] = useState<string>(conversations[0]?.id ?? '')
  const [newMessage, setNewMessage] = useState('')
  const [localConvs, setLocalConvs] = useState(conversations)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const activeConv = localConvs.find(c => c.id === activeConvId)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeConv?.messages?.length])

  const sendMessage = () => {
    if (!newMessage.trim() || !activeConvId) return
    const msg: Message = {
      id: generateId(),
      senderId: 'me',
      text: newMessage.trim(),
      timestamp: 'Just now',
    }
    setLocalConvs(prev => prev.map(c => c.id === activeConvId ? { ...c, messages: [...c.messages, msg], lastMessage: msg.text, lastMessageTime: 'Just now' } : c))
    setNewMessage('')
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h1 className="font-serif text-3xl font-bold text-foreground mb-6">Messages</h1>
      <Card className="border-primary/15 bg-card overflow-hidden">
        <div className="flex h-[560px]">
          {/* Conversation List */}
          <div className="w-80 border-r border-primary/10 shrink-0 flex flex-col">
            <div className="p-3 border-b border-primary/10">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Conversations</p>
            </div>
            <ScrollArea className="flex-1">
              {localConvs.map((conv) => (
                <button key={conv.id} onClick={() => setActiveConvId(conv.id)} className={`w-full text-left p-3 flex items-start gap-3 border-b border-primary/5 transition-colors ${activeConvId === conv.id ? 'bg-primary/5' : 'hover:bg-secondary/50'}`}>
                  <div className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center" style={{ backgroundColor: conv.listingImageColor }}>
                    <FiUser className="w-4 h-4 text-white/60" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground truncate">{conv.participantName}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">{conv.lastMessageTime}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{conv.listingTitle}</p>
                    <p className="text-xs text-foreground/60 truncate mt-0.5">{conv.lastMessage}</p>
                  </div>
                  {conv.unread > 0 && (
                    <span className="w-5 h-5 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center shrink-0">{conv.unread}</span>
                  )}
                </button>
              ))}
            </ScrollArea>
          </div>

          {/* Chat Area */}
          {activeConv ? (
            <div className="flex-1 flex flex-col">
              {/* Linked listing */}
              <div className="p-3 border-b border-primary/10 flex items-center gap-3 bg-secondary/30">
                <div className="w-10 h-10 rounded-md shrink-0 flex items-center justify-center" style={{ backgroundColor: activeConv.listingImageColor }}>
                  <FiImage className="w-4 h-4 text-white/40" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{activeConv.listingTitle}</p>
                  <p className="text-xs text-primary font-bold">${activeConv.listingPrice}</p>
                </div>
                <span className="text-xs text-muted-foreground">{activeConv.participantName}</span>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                  {Array.isArray(activeConv?.messages) && activeConv.messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.senderId === 'me' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-lg px-4 py-2.5 ${msg.senderId === 'me' ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-secondary text-secondary-foreground rounded-bl-none'}`}>
                        <p className="text-sm">{msg.text}</p>
                        <p className={`text-[10px] mt-1 ${msg.senderId === 'me' ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>{msg.timestamp}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Input */}
              <div className="p-3 border-t border-primary/10 flex items-center gap-2">
                <Input placeholder="Type a message..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} className="border-primary/20" onKeyDown={(e) => { if (e.key === 'Enter') sendMessage() }} />
                <Button onClick={sendMessage} disabled={!newMessage.trim()} size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 px-3">
                  <FiSend className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-muted-foreground text-sm">Select a conversation to start messaging.</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

// ─── Main Page ───
export default function Page() {
  const [activeScreen, setActiveScreen] = useState<ScreenType>('home')
  const [listings, setListings] = useState<Listing[]>(INITIAL_LISTINGS)
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [sampleData, setSampleData] = useState(false)

  const toggleFavorite = useCallback((id: string) => {
    setFavorites(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }, [])

  const handlePublish = useCallback((listing: Listing) => {
    setListings(prev => [listing, ...prev])
  }, [])

  const unreadCount = useMemo(() => MOCK_CONVERSATIONS.reduce((sum, c) => sum + c.unread, 0), [])

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background text-foreground">
        <NavBar activeScreen={activeScreen} setActiveScreen={setActiveScreen} unreadCount={unreadCount} />

        {/* Sample Data Toggle */}
        <div className="max-w-7xl mx-auto px-4 pt-3 flex justify-end items-center gap-2">
          <Label htmlFor="sample-toggle" className="text-xs text-muted-foreground cursor-pointer">Sample Data</Label>
          <Switch id="sample-toggle" checked={sampleData} onCheckedChange={setSampleData} />
        </div>

        {/* Screens */}
        {activeScreen === 'home' && (
          <HomeScreen setActiveScreen={setActiveScreen} listings={listings} favorites={favorites} toggleFavorite={toggleFavorite} setSelectedListing={(l) => { setSelectedListing(l); setActiveScreen('detail') }} setSearchQuery={(q) => setSearchQuery(q)} />
        )}

        {activeScreen === 'browse' && (
          <BrowseScreen listings={listings} favorites={favorites} toggleFavorite={toggleFavorite} setSelectedListing={(l) => setSelectedListing(l)} setActiveScreen={setActiveScreen} initialQuery={searchQuery} />
        )}

        {activeScreen === 'sell' && (
          <SellScreen onPublish={handlePublish} setActiveScreen={setActiveScreen} />
        )}

        {activeScreen === 'detail' && selectedListing && (
          <DetailScreen listing={selectedListing} listings={listings} setActiveScreen={setActiveScreen} setSelectedListing={setSelectedListing} favorites={favorites} toggleFavorite={toggleFavorite} />
        )}

        {activeScreen === 'mylistings' && (
          <MyListingsScreen listings={listings} setListings={setListings} setSelectedListing={(l) => setSelectedListing(l)} setActiveScreen={setActiveScreen} />
        )}

        {activeScreen === 'messages' && (
          <MessagesScreen conversations={MOCK_CONVERSATIONS} />
        )}

        {/* Agent Status Footer */}
        <footer className="max-w-7xl mx-auto px-4 pb-8 pt-4">
          <Card className="border-primary/10 bg-card/50">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Powered by AI Agents</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-green-500/60" />
                  <div>
                    <span className="font-medium text-foreground/80">Listing Assistant Agent</span>
                    <p className="text-[11px]">Enhances listings with AI-generated descriptions, highlights, and keywords</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-green-500/60" />
                  <div>
                    <span className="font-medium text-foreground/80">Buyer Discovery Agent</span>
                    <p className="text-[11px]">Interprets natural language searches into structured filters and suggestions</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </footer>
      </div>
    </ErrorBoundary>
  )
}
