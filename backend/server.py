from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, time

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="Naan Staap API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# =====================
# Models
# =====================

class MenuItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    price: Optional[float] = None
    category: str
    image_url: str
    is_vegetarian: bool = False
    is_popular: bool = False
    is_spicy: bool = False
    calories: Optional[int] = None
    allergens: List[str] = []
    customizations: List[str] = []

class MenuCategory(BaseModel):
    id: str
    name: str
    description: str
    image_url: str
    item_count: int = 0

class StoreHours(BaseModel):
    day: str
    open_time: str
    close_time: str
    is_closed: bool = False

class Store(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    address: str
    phone: str
    city: str
    postcode: str
    latitude: float
    longitude: float
    google_maps_url: str
    image_url: str = ""
    hours: List[StoreHours] = []
    is_open_now: bool = True
    delivery_available: bool = True
    dine_in_available: bool = True
    takeaway_available: bool = True

class ChaiItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    price: Optional[float] = None
    image_url: str
    is_signature: bool = False
    size_options: List[dict] = []

class Deal(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    discount_percentage: Optional[int] = None
    discount_amount: Optional[float] = None
    code: Optional[str] = None
    image_url: str
    valid_until: str
    terms: str
    is_active: bool = True

class CartItem(BaseModel):
    item_id: str
    name: str
    price: float
    quantity: int
    customizations: List[str] = []
    special_instructions: str = ""

class Cart(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    items: List[CartItem] = []
    subtotal: float = 0
    delivery_fee: float = 2.50
    total: float = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class CartAddRequest(BaseModel):
    cart_id: Optional[str] = None
    item_id: str
    name: str
    price: float
    quantity: int = 1
    customizations: List[str] = []
    special_instructions: str = ""

class CartUpdateRequest(BaseModel):
    item_id: str
    quantity: int

class Order(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    cart_id: str
    customer_name: str
    customer_phone: str
    customer_email: str
    delivery_address: Optional[str] = None
    store_id: str
    order_type: str  # delivery, pickup, dine-in
    items: List[CartItem] = []
    subtotal: float
    delivery_fee: float = 0
    total: float
    status: str = "pending"  # pending, confirmed, preparing, ready, delivered, cancelled
    payment_method: str = "cash"
    special_instructions: str = ""
    estimated_time: int = 30  # minutes
    created_at: datetime = Field(default_factory=datetime.utcnow)

class OrderCreateRequest(BaseModel):
    cart_id: str
    customer_name: str
    customer_phone: str
    customer_email: str
    delivery_address: Optional[str] = None
    store_id: str
    order_type: str
    payment_method: str = "cash"
    special_instructions: str = ""

class TableBooking(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    store_id: str
    customer_name: str
    customer_phone: str
    customer_email: str
    date: str
    time: str
    party_size: int
    special_requests: str = ""
    status: str = "pending"  # pending, confirmed, cancelled
    created_at: datetime = Field(default_factory=datetime.utcnow)

class TableBookingRequest(BaseModel):
    store_id: str
    customer_name: str
    customer_phone: str
    customer_email: str
    date: str
    time: str
    party_size: int
    special_requests: str = ""

class NewsletterSubscription(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    subscribed_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True

class NewsletterSubscribeRequest(BaseModel):
    email: str

class ContactRequest(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    phone: str
    subject: str
    message: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ContactRequestCreate(BaseModel):
    name: str
    email: str
    phone: str
    subject: str
    message: str

class FavoriteItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    item_id: str
    item_name: str
    item_price: float
    item_image: str
    added_at: datetime = Field(default_factory=datetime.utcnow)

class FavoriteRequest(BaseModel):
    user_id: str
    item_id: str
    item_name: str
    item_price: float
    item_image: str

# =====================
# Static Data
# =====================

DEFAULT_HOURS = [
    StoreHours(day="Monday", open_time="11:00", close_time="23:00"),
    StoreHours(day="Tuesday", open_time="11:00", close_time="23:00"),
    StoreHours(day="Wednesday", open_time="11:00", close_time="23:00"),
    StoreHours(day="Thursday", open_time="11:00", close_time="23:00"),
    StoreHours(day="Friday", open_time="11:00", close_time="00:00"),
    StoreHours(day="Saturday", open_time="11:00", close_time="00:00"),
    StoreHours(day="Sunday", open_time="12:00", close_time="22:00"),
]

MENU_CATEGORIES = [
    MenuCategory(id="naan", name="Naan", description="Freshly baked traditional naan breads", image_url="https://images.pexels.com/photos/30203311/pexels-photo-30203311.jpeg", item_count=6),
    MenuCategory(id="paratha", name="Paratha", description="Layered flatbreads with various fillings", image_url="https://images.pexels.com/photos/30203311/pexels-photo-30203311.jpeg", item_count=4),
    MenuCategory(id="curries", name="Curries", description="Rich and flavorful curry dishes", image_url="https://images.pexels.com/photos/35287423/pexels-photo-35287423.jpeg", item_count=6),
    MenuCategory(id="street-food", name="Street Food", description="Authentic South Asian street delights", image_url="https://images.pexels.com/photos/34968009/pexels-photo-34968009.jpeg", item_count=5),
    MenuCategory(id="snacks", name="Snacks", description="Quick bites and sides", image_url="https://images.pexels.com/photos/18488315/pexels-photo-18488315.jpeg", item_count=4),
    MenuCategory(id="sweets", name="Sweets", description="Traditional desserts and sweet treats", image_url="https://images.pexels.com/photos/18488315/pexels-photo-18488315.jpeg", item_count=4),
    MenuCategory(id="drinks", name="Drinks", description="Refreshing beverages and signature chais", image_url="https://images.pexels.com/photos/18030044/pexels-photo-18030044.jpeg", item_count=4),
]

MENU_ITEMS = [
    # Naan items
    MenuItem(id="1", name="Plain Naan", description="Soft, fluffy tandoor-baked bread made with refined flour and yogurt", price=2.50, category="naan", image_url="https://images.pexels.com/photos/30203311/pexels-photo-30203311.jpeg", is_vegetarian=True, calories=260, allergens=["Gluten", "Dairy"], customizations=["Extra butter", "Garlic brushed"]),
    MenuItem(id="2", name="Butter Naan", description="Naan brushed with golden butter for extra richness", price=3.00, category="naan", image_url="https://images.pexels.com/photos/30203311/pexels-photo-30203311.jpeg", is_vegetarian=True, is_popular=True, calories=320, allergens=["Gluten", "Dairy"], customizations=["Extra butter", "Light butter"]),
    MenuItem(id="3", name="Garlic Naan", description="Naan topped with fresh garlic and coriander", price=3.50, category="naan", image_url="https://images.pexels.com/photos/30203311/pexels-photo-30203311.jpeg", is_vegetarian=True, is_popular=True, calories=290, allergens=["Gluten", "Dairy"], customizations=["Extra garlic", "Chilli flakes"]),
    MenuItem(id="4", name="Cheese Naan", description="Naan stuffed with melted mozzarella cheese", price=4.00, category="naan", image_url="https://images.pexels.com/photos/30203311/pexels-photo-30203311.jpeg", is_vegetarian=True, calories=380, allergens=["Gluten", "Dairy"], customizations=["Extra cheese", "Mixed cheese"]),
    MenuItem(id="5", name="Keema Naan", description="Naan stuffed with spiced minced lamb", price=5.00, category="naan", image_url="https://images.pexels.com/photos/30203311/pexels-photo-30203311.jpeg", is_popular=True, is_spicy=True, calories=420, allergens=["Gluten", "Dairy"], customizations=["Extra spicy", "Mild"]),
    MenuItem(id="6", name="Peshwari Naan", description="Sweet naan with coconut, almonds & sultanas", price=4.50, category="naan", image_url="https://images.pexels.com/photos/30203311/pexels-photo-30203311.jpeg", is_vegetarian=True, calories=350, allergens=["Gluten", "Dairy", "Nuts"], customizations=["Extra filling"]),
    
    # Paratha items
    MenuItem(id="7", name="Aloo Paratha", description="Paratha stuffed with spiced potato, served with yogurt and pickle", price=4.00, category="paratha", image_url="https://images.pexels.com/photos/30203311/pexels-photo-30203311.jpeg", is_vegetarian=True, is_popular=True, calories=340, allergens=["Gluten", "Dairy"], customizations=["Extra butter", "With egg"]),
    MenuItem(id="8", name="Gobi Paratha", description="Paratha stuffed with spiced cauliflower", price=4.00, category="paratha", image_url="https://images.pexels.com/photos/30203311/pexels-photo-30203311.jpeg", is_vegetarian=True, calories=320, allergens=["Gluten", "Dairy"], customizations=["Extra butter"]),
    MenuItem(id="9", name="Keema Paratha", description="Paratha stuffed with spiced minced meat", price=5.50, category="paratha", image_url="https://images.pexels.com/photos/30203311/pexels-photo-30203311.jpeg", is_spicy=True, calories=450, allergens=["Gluten", "Dairy"], customizations=["Extra spicy", "With egg"]),
    MenuItem(id="10", name="Plain Paratha", description="Layered buttery flatbread", price=3.00, category="paratha", image_url="https://images.pexels.com/photos/30203311/pexels-photo-30203311.jpeg", is_vegetarian=True, calories=280, allergens=["Gluten", "Dairy"], customizations=["Extra butter"]),
    
    # Curries
    MenuItem(id="11", name="Butter Chicken", description="Tender chicken pieces in a creamy tomato-based sauce with butter and aromatic spices", price=9.50, category="curries", image_url="https://images.pexels.com/photos/35287423/pexels-photo-35287423.jpeg", is_popular=True, calories=550, allergens=["Dairy"], customizations=["Extra creamy", "Spicy", "With rice"]),
    MenuItem(id="12", name="Lamb Karahi", description="Lamb cooked in a wok with tomatoes, peppers and traditional spices", price=11.50, category="curries", image_url="https://images.pexels.com/photos/35287423/pexels-photo-35287423.jpeg", is_popular=True, is_spicy=True, calories=620, allergens=[], customizations=["Extra spicy", "Mild", "With rice"]),
    MenuItem(id="13", name="Chicken Tikka Masala", description="Grilled chicken tikka pieces in a rich creamy spiced sauce", price=10.00, category="curries", image_url="https://images.pexels.com/photos/35287423/pexels-photo-35287423.jpeg", is_popular=True, calories=580, allergens=["Dairy"], customizations=["Extra creamy", "Spicy", "With rice"]),
    MenuItem(id="14", name="Lamb Nihari", description="Slow-cooked lamb shank in rich aromatic gravy - a traditional breakfast dish", price=12.50, category="curries", image_url="https://images.pexels.com/photos/35287423/pexels-photo-35287423.jpeg", is_spicy=True, calories=650, allergens=[], customizations=["Extra spicy", "With naan"]),
    MenuItem(id="15", name="Paneer Butter Masala", description="Cottage cheese cubes in a creamy tomato sauce", price=8.50, category="curries", image_url="https://images.pexels.com/photos/35287423/pexels-photo-35287423.jpeg", is_vegetarian=True, calories=480, allergens=["Dairy"], customizations=["Extra paneer", "Spicy"]),
    MenuItem(id="16", name="Daal Tadka", description="Yellow lentils tempered with cumin, garlic and spices", price=6.50, category="curries", image_url="https://images.pexels.com/photos/35287423/pexels-photo-35287423.jpeg", is_vegetarian=True, calories=320, allergens=[], customizations=["Extra tadka", "With rice"]),
    
    # Street Food
    MenuItem(id="17", name="Samosa Chaat", description="Crushed samosas topped with chickpeas, chutneys, yogurt and sev", price=5.50, category="street-food", image_url="https://images.pexels.com/photos/34968009/pexels-photo-34968009.jpeg", is_vegetarian=True, is_popular=True, calories=380, allergens=["Gluten", "Dairy"], customizations=["Extra spicy", "No yogurt"]),
    MenuItem(id="18", name="Pani Puri", description="6 crispy shells with spiced water, chickpeas and chutneys", price=4.50, category="street-food", image_url="https://images.pexels.com/photos/34968009/pexels-photo-34968009.jpeg", is_vegetarian=True, calories=250, allergens=["Gluten"], customizations=["Extra spicy water", "Sweet water"]),
    MenuItem(id="19", name="Seekh Kebab Roll", description="Minced meat kebabs wrapped in paratha with salad and sauces", price=7.50, category="street-food", image_url="https://images.pexels.com/photos/34968009/pexels-photo-34968009.jpeg", is_popular=True, is_spicy=True, calories=520, allergens=["Gluten"], customizations=["Extra spicy", "No salad"]),
    MenuItem(id="20", name="Chicken Tikka Roll", description="Grilled chicken tikka wrapped in paratha with fresh salad", price=7.50, category="street-food", image_url="https://images.pexels.com/photos/34968009/pexels-photo-34968009.jpeg", calories=480, allergens=["Gluten", "Dairy"], customizations=["Extra sauce", "Spicy"]),
    MenuItem(id="21", name="Dahi Bhalla", description="Lentil dumplings soaked in creamy yogurt with chutneys", price=5.00, category="street-food", image_url="https://images.pexels.com/photos/34968009/pexels-photo-34968009.jpeg", is_vegetarian=True, calories=280, allergens=["Gluten", "Dairy"], customizations=["Extra yogurt"]),
    
    # Snacks
    MenuItem(id="22", name="Chicken Wings", description="6 spicy tandoori chicken wings marinated in yogurt and spices", price=6.50, category="snacks", image_url="https://images.pexels.com/photos/18488315/pexels-photo-18488315.jpeg", is_spicy=True, calories=420, allergens=["Dairy"], customizations=["Extra spicy", "BBQ sauce"]),
    MenuItem(id="23", name="Vegetable Samosa", description="2 crispy pastries with spiced potato and pea filling", price=2.50, category="snacks", image_url="https://images.pexels.com/photos/18488315/pexels-photo-18488315.jpeg", is_vegetarian=True, calories=280, allergens=["Gluten"], customizations=["With chutney"]),
    MenuItem(id="24", name="Chicken Samosa", description="2 crispy pastries with spiced chicken filling", price=3.00, category="snacks", image_url="https://images.pexels.com/photos/18488315/pexels-photo-18488315.jpeg", calories=320, allergens=["Gluten"], customizations=["With chutney"]),
    MenuItem(id="25", name="Pakora Platter", description="Mixed vegetable fritters served with mint chutney", price=4.00, category="snacks", image_url="https://images.pexels.com/photos/18488315/pexels-photo-18488315.jpeg", is_vegetarian=True, calories=350, allergens=["Gluten"], customizations=["Extra crispy"]),
    
    # Sweets
    MenuItem(id="26", name="Gulab Jamun", description="3 deep-fried milk balls soaked in rose-flavored syrup", price=4.00, category="sweets", image_url="https://images.pexels.com/photos/18488315/pexels-photo-18488315.jpeg", is_vegetarian=True, is_popular=True, calories=380, allergens=["Dairy", "Gluten"], customizations=["Warm", "With ice cream"]),
    MenuItem(id="27", name="Kheer", description="Creamy rice pudding with cardamom, pistachios and almonds", price=3.50, category="sweets", image_url="https://images.pexels.com/photos/18488315/pexels-photo-18488315.jpeg", is_vegetarian=True, calories=320, allergens=["Dairy", "Nuts"], customizations=["Extra nuts"]),
    MenuItem(id="28", name="Jalebi", description="Crispy sweet spirals soaked in saffron syrup", price=3.50, category="sweets", image_url="https://images.pexels.com/photos/18488315/pexels-photo-18488315.jpeg", is_vegetarian=True, calories=350, allergens=["Gluten", "Dairy"], customizations=["Warm"]),
    MenuItem(id="29", name="Ras Malai", description="2 soft cheese balls in creamy cardamom milk", price=4.50, category="sweets", image_url="https://images.pexels.com/photos/18488315/pexels-photo-18488315.jpeg", is_vegetarian=True, calories=290, allergens=["Dairy", "Nuts"], customizations=["Extra cream"]),
    
    # Drinks
    MenuItem(id="30", name="Karak Chai", description="Signature strong tea with cardamom - bold and flavourful", price=2.50, category="drinks", image_url="https://images.pexels.com/photos/18030044/pexels-photo-18030044.jpeg", is_vegetarian=True, is_popular=True, calories=120, allergens=["Dairy"], customizations=["Sugar free", "Extra strong"]),
    MenuItem(id="31", name="Mango Lassi", description="Creamy mango yogurt drink - refreshing and sweet", price=3.50, category="drinks", image_url="https://images.pexels.com/photos/18030044/pexels-photo-18030044.jpeg", is_vegetarian=True, calories=220, allergens=["Dairy"], customizations=["Less sweet"]),
    MenuItem(id="32", name="Masala Chai", description="Spiced tea with ginger, cinnamon and cardamom", price=2.50, category="drinks", image_url="https://images.pexels.com/photos/18030044/pexels-photo-18030044.jpeg", is_vegetarian=True, calories=110, allergens=["Dairy"], customizations=["Sugar free"]),
    MenuItem(id="33", name="Fresh Lime Soda", description="Refreshing lime drink with mint - sweet or salted", price=2.50, category="drinks", image_url="https://images.pexels.com/photos/18030044/pexels-photo-18030044.jpeg", is_vegetarian=True, calories=80, allergens=[], customizations=["Sweet", "Salted", "Mixed"]),
]

STORES = [
    Store(id="1", name="Green Street", address="32 Plashet Grove", city="London", postcode="E6 1AE", phone="+44 20 8257 3783", latitude=51.5340, longitude=0.0450, google_maps_url="https://maps.app.goo.gl/azXJaLwcBPDFwNuN8", image_url="https://images.unsplash.com/photo-1556745750-68295fefafc5?w=400", hours=DEFAULT_HOURS),
    Store(id="2", name="Whitechapel", address="97 New Rd", city="London", postcode="E1 1HJ", phone="+44 20 7247 5693", latitude=51.5165, longitude=-0.0645, google_maps_url="https://maps.google.com/?q=97+New+Rd+London+E1+1HJ", image_url="https://images.unsplash.com/photo-1556745750-68295fefafc5?w=400", hours=DEFAULT_HOURS),
    Store(id="3", name="Ilford", address="209 Ilford Ln", city="Ilford", postcode="IG1 2RU", phone="+44 20 8637 4050", latitude=51.5570, longitude=0.0660, google_maps_url="https://maps.google.com/?q=209+Ilford+Ln+Ilford+IG1+2RU", image_url="https://images.unsplash.com/photo-1556745750-68295fefafc5?w=400", hours=DEFAULT_HOURS),
    Store(id="4", name="Gants Hill", address="374 Cranbrook RD, Gants Hill", city="Ilford", postcode="IG2 6HW", phone="+44 20 8926 6011", latitude=51.5765, longitude=0.0668, google_maps_url="https://maps.google.com/?q=374+Cranbrook+RD+Gants+Hill+Ilford+IG2+6HW", image_url="https://images.unsplash.com/photo-1556745750-68295fefafc5?w=400", hours=DEFAULT_HOURS),
    Store(id="5", name="Harrow", address="11 Station Rd", city="Harrow", postcode="HA1 2UF", phone="+44 20 8248 6393", latitude=51.5795, longitude=-0.3340, google_maps_url="https://maps.google.com/?q=11+Station+Rd+Harrow+HA1+2UF", image_url="https://images.unsplash.com/photo-1556745750-68295fefafc5?w=400", hours=DEFAULT_HOURS),
    Store(id="6", name="Southall", address="30 South Rd", city="Southall, London", postcode="UB1 1RR", phone="+44 20 3093 6446", latitude=51.5110, longitude=-0.3762, google_maps_url="https://maps.google.com/?q=30+South+Rd+Southall+London+UB1+1RR", image_url="https://images.unsplash.com/photo-1556745750-68295fefafc5?w=400", hours=DEFAULT_HOURS),
    Store(id="7", name="Tooting", address="233 Upper Tooting Road", city="London", postcode="SW17 7TG", phone="+44 20 8922 7549", latitude=51.4294, longitude=-0.1642, google_maps_url="https://maps.google.com/?q=233+Upper+Tooting+Road+London+SW17+7TG", image_url="https://images.unsplash.com/photo-1556745750-68295fefafc5?w=400", hours=DEFAULT_HOURS),
    Store(id="8", name="Romford", address="Unit 2 7, Station Chambers, Victoria Road", city="Romford", postcode="RM1 2HS", phone="+44 79 3632 4856", latitude=51.5748, longitude=0.1838, google_maps_url="https://maps.google.com/?q=Victoria+Road+Romford+RM1+2HS", image_url="https://images.unsplash.com/photo-1556745750-68295fefafc5?w=400", hours=DEFAULT_HOURS),
    Store(id="9", name="Leicester", address="6 Horsefair St", city="Leicester", postcode="LE1 5BN", phone="+44 11 6507 9748", latitude=52.6367, longitude=-1.1335, google_maps_url="https://maps.google.com/?q=6+Horsefair+St+Leicester+LE1+5BN", image_url="https://images.unsplash.com/photo-1556745750-68295fefafc5?w=400", hours=DEFAULT_HOURS),
]

CHAI_ITEMS = [
    ChaiItem(id="1", name="Karak Chai", description="Our signature strong tea prepared with carefully selected tea leaves, infused with cardamom, and simmered to perfection. Bold, flavourful with a velvety texture and warming spice.", price=2.50, image_url="https://images.pexels.com/photos/18030044/pexels-photo-18030044.jpeg", is_signature=True, size_options=[{"size": "Regular", "price": 2.50}, {"size": "Large", "price": 3.50}]),
    ChaiItem(id="2", name="Cinnamon Chai", description="Karak Chai with a pinch of cinnamon - the choice of many tea lovers.", price=3.00, image_url="https://images.pexels.com/photos/18030044/pexels-photo-18030044.jpeg", size_options=[{"size": "Regular", "price": 3.00}, {"size": "Large", "price": 4.00}]),
    ChaiItem(id="3", name="Caramel Chai", description="A delightful mix of coffee, tea, and candy - Karak Chai with a caramel taste.", price=3.50, image_url="https://images.pexels.com/photos/18030044/pexels-photo-18030044.jpeg", size_options=[{"size": "Regular", "price": 3.50}, {"size": "Large", "price": 4.50}]),
    ChaiItem(id="4", name="Vanilla Chai", description="Karak Chai with vanilla flavour - soothing, delicious, and aromatic.", price=3.00, image_url="https://images.pexels.com/photos/18030044/pexels-photo-18030044.jpeg", size_options=[{"size": "Regular", "price": 3.00}, {"size": "Large", "price": 4.00}]),
    ChaiItem(id="5", name="Karak Chocolate", description="Hot chocolate infused with karak chai and topped with whipping cream.", price=4.00, image_url="https://images.pexels.com/photos/18030044/pexels-photo-18030044.jpeg", size_options=[{"size": "Regular", "price": 4.00}, {"size": "Large", "price": 5.00}]),
    ChaiItem(id="6", name="Pink Tea (Kashmiri)", description="Traditional Kashmiri Chai - a delightful pink tea sprinkled with flaked almonds.", price=3.50, image_url="https://images.pexels.com/photos/18030044/pexels-photo-18030044.jpeg", size_options=[{"size": "Regular", "price": 3.50}, {"size": "Large", "price": 4.50}]),
    ChaiItem(id="7", name="Masala Chai", description="Spiced tea blend with ginger, cinnamon, cloves, and cardamom.", price=2.75, image_url="https://images.pexels.com/photos/18030044/pexels-photo-18030044.jpeg", size_options=[{"size": "Regular", "price": 2.75}, {"size": "Large", "price": 3.75}]),
    ChaiItem(id="8", name="Green Tea", description="Experience the healing properties of our premium green tea.", price=2.50, image_url="https://images.pexels.com/photos/18030044/pexels-photo-18030044.jpeg", size_options=[{"size": "Regular", "price": 2.50}, {"size": "Large", "price": 3.50}]),
    ChaiItem(id="9", name="Chai Latte", description="Fusion of traditional chai with creamy steamed milk.", price=3.50, image_url="https://images.pexels.com/photos/18030044/pexels-photo-18030044.jpeg", size_options=[{"size": "Regular", "price": 3.50}, {"size": "Large", "price": 4.50}]),
]

DEALS = [
    Deal(id="1", title="Family Feast Deal", description="2 Curries + 4 Naan + Rice + 4 Drinks", discount_percentage=20, code="FAMILY20", image_url="https://images.pexels.com/photos/35287423/pexels-photo-35287423.jpeg", valid_until="2025-12-31", terms="Valid on dine-in and delivery. Cannot be combined with other offers.", is_active=True),
    Deal(id="2", title="Lunch Special", description="Any curry with naan and drink for £9.99", discount_amount=3.00, code="LUNCH999", image_url="https://images.pexels.com/photos/35287423/pexels-photo-35287423.jpeg", valid_until="2025-12-31", terms="Available Mon-Fri, 11am-3pm only.", is_active=True),
    Deal(id="3", title="Chai & Paratha Combo", description="2 Parathas + Karak Chai for £7.99", discount_percentage=15, code="CHAI15", image_url="https://images.pexels.com/photos/18030044/pexels-photo-18030044.jpeg", valid_until="2025-12-31", terms="Valid all day. Dine-in and takeaway.", is_active=True),
    Deal(id="4", title="First Order Discount", description="Get 10% off on your first order", discount_percentage=10, code="WELCOME10", image_url="https://images.pexels.com/photos/34968009/pexels-photo-34968009.jpeg", valid_until="2025-12-31", terms="Valid for new customers only. Min order £15.", is_active=True),
    Deal(id="5", title="Student Deal", description="15% off with valid student ID", discount_percentage=15, code="STUDENT15", image_url="https://images.pexels.com/photos/18488315/pexels-photo-18488315.jpeg", valid_until="2025-12-31", terms="Valid student ID required. Dine-in only.", is_active=True),
]

# =====================
# API Routes
# =====================

@api_router.get("/")
async def root():
    return {"message": "Welcome to Naan Staap API", "status": "healthy"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "Naan Staap API"}

# Menu Routes
@api_router.get("/menu/categories", response_model=List[MenuCategory])
async def get_menu_categories():
    """Get all menu categories"""
    return MENU_CATEGORIES

@api_router.get("/menu/items", response_model=List[MenuItem])
async def get_menu_items(category: Optional[str] = None, search: Optional[str] = None):
    """Get menu items, optionally filtered by category or search query"""
    items = MENU_ITEMS
    if category:
        items = [item for item in items if item.category == category]
    if search:
        search_lower = search.lower()
        items = [item for item in items if search_lower in item.name.lower() or search_lower in item.description.lower()]
    return items

@api_router.get("/menu/items/popular", response_model=List[MenuItem])
async def get_popular_items():
    """Get popular menu items"""
    return [item for item in MENU_ITEMS if item.is_popular]

@api_router.get("/menu/items/{item_id}", response_model=MenuItem)
async def get_menu_item(item_id: str):
    """Get a specific menu item by ID"""
    for item in MENU_ITEMS:
        if item.id == item_id:
            return item
    raise HTTPException(status_code=404, detail="Menu item not found")

@api_router.get("/menu/search", response_model=List[MenuItem])
async def search_menu(q: str):
    """Search menu items"""
    search_lower = q.lower()
    return [item for item in MENU_ITEMS if search_lower in item.name.lower() or search_lower in item.description.lower()]

# Store Routes
@api_router.get("/stores", response_model=List[Store])
async def get_stores():
    """Get all store locations"""
    return STORES

@api_router.get("/stores/{store_id}", response_model=Store)
async def get_store(store_id: str):
    """Get a specific store by ID"""
    for store in STORES:
        if store.id == store_id:
            return store
    raise HTTPException(status_code=404, detail="Store not found")

# Chai Routes
@api_router.get("/chai", response_model=List[ChaiItem])
async def get_chai_items():
    """Get all chai items"""
    return CHAI_ITEMS

@api_router.get("/chai/signature", response_model=List[ChaiItem])
async def get_signature_chai():
    """Get signature chai items"""
    return [chai for chai in CHAI_ITEMS if chai.is_signature]

# Deals Routes
@api_router.get("/deals", response_model=List[Deal])
async def get_deals():
    """Get all active deals"""
    return [deal for deal in DEALS if deal.is_active]

@api_router.get("/deals/{deal_id}", response_model=Deal)
async def get_deal(deal_id: str):
    """Get a specific deal by ID"""
    for deal in DEALS:
        if deal.id == deal_id:
            return deal
    raise HTTPException(status_code=404, detail="Deal not found")

# Cart Routes
@api_router.post("/cart/add", response_model=Cart)
async def add_to_cart(request: CartAddRequest):
    """Add item to cart"""
    if request.cart_id:
        # Find existing cart
        cart_data = await db.carts.find_one({"id": request.cart_id})
        if cart_data:
            cart = Cart(**cart_data)
            # Check if item already exists
            item_found = False
            for item in cart.items:
                if item.item_id == request.item_id and item.customizations == request.customizations:
                    item.quantity += request.quantity
                    item_found = True
                    break
            if not item_found:
                cart.items.append(CartItem(
                    item_id=request.item_id,
                    name=request.name,
                    price=request.price,
                    quantity=request.quantity,
                    customizations=request.customizations,
                    special_instructions=request.special_instructions
                ))
        else:
            cart = Cart()
            cart.items.append(CartItem(
                item_id=request.item_id,
                name=request.name,
                price=request.price,
                quantity=request.quantity,
                customizations=request.customizations,
                special_instructions=request.special_instructions
            ))
    else:
        cart = Cart()
        cart.items.append(CartItem(
            item_id=request.item_id,
            name=request.name,
            price=request.price,
            quantity=request.quantity,
            customizations=request.customizations,
            special_instructions=request.special_instructions
        ))
    
    # Calculate totals
    cart.subtotal = sum(item.price * item.quantity for item in cart.items)
    cart.total = cart.subtotal + cart.delivery_fee
    cart.updated_at = datetime.utcnow()
    
    # Save to database
    await db.carts.update_one(
        {"id": cart.id},
        {"$set": cart.dict()},
        upsert=True
    )
    return cart

@api_router.get("/cart/{cart_id}", response_model=Cart)
async def get_cart(cart_id: str):
    """Get cart by ID"""
    cart_data = await db.carts.find_one({"id": cart_id})
    if not cart_data:
        raise HTTPException(status_code=404, detail="Cart not found")
    return Cart(**cart_data)

@api_router.put("/cart/{cart_id}/update", response_model=Cart)
async def update_cart_item(cart_id: str, request: CartUpdateRequest):
    """Update item quantity in cart"""
    cart_data = await db.carts.find_one({"id": cart_id})
    if not cart_data:
        raise HTTPException(status_code=404, detail="Cart not found")
    
    cart = Cart(**cart_data)
    
    if request.quantity <= 0:
        cart.items = [item for item in cart.items if item.item_id != request.item_id]
    else:
        for item in cart.items:
            if item.item_id == request.item_id:
                item.quantity = request.quantity
                break
    
    # Recalculate totals
    cart.subtotal = sum(item.price * item.quantity for item in cart.items)
    cart.total = cart.subtotal + (cart.delivery_fee if cart.subtotal > 0 else 0)
    cart.updated_at = datetime.utcnow()
    
    await db.carts.update_one({"id": cart_id}, {"$set": cart.dict()})
    return cart

@api_router.delete("/cart/{cart_id}/clear", response_model=dict)
async def clear_cart(cart_id: str):
    """Clear all items from cart"""
    await db.carts.delete_one({"id": cart_id})
    return {"message": "Cart cleared successfully"}

# Order Routes
@api_router.post("/orders", response_model=Order)
async def create_order(request: OrderCreateRequest):
    """Create a new order"""
    # Get cart
    cart_data = await db.carts.find_one({"id": request.cart_id})
    if not cart_data:
        raise HTTPException(status_code=404, detail="Cart not found")
    
    cart = Cart(**cart_data)
    if not cart.items:
        raise HTTPException(status_code=400, detail="Cart is empty")
    
    delivery_fee = cart.delivery_fee if request.order_type == "delivery" else 0
    
    order = Order(
        cart_id=request.cart_id,
        customer_name=request.customer_name,
        customer_phone=request.customer_phone,
        customer_email=request.customer_email,
        delivery_address=request.delivery_address,
        store_id=request.store_id,
        order_type=request.order_type,
        items=cart.items,
        subtotal=cart.subtotal,
        delivery_fee=delivery_fee,
        total=cart.subtotal + delivery_fee,
        payment_method=request.payment_method,
        special_instructions=request.special_instructions,
        status="confirmed"
    )
    
    await db.orders.insert_one(order.dict())
    # Clear the cart after order
    await db.carts.delete_one({"id": request.cart_id})
    
    return order

@api_router.get("/orders/{order_id}", response_model=Order)
async def get_order(order_id: str):
    """Get order by ID"""
    order_data = await db.orders.find_one({"id": order_id})
    if not order_data:
        raise HTTPException(status_code=404, detail="Order not found")
    return Order(**order_data)

@api_router.get("/orders/track/{order_id}")
async def track_order(order_id: str):
    """Track order status"""
    order_data = await db.orders.find_one({"id": order_id})
    if not order_data:
        raise HTTPException(status_code=404, detail="Order not found")
    
    order = Order(**order_data)
    return {
        "order_id": order.id,
        "status": order.status,
        "estimated_time": order.estimated_time,
        "order_type": order.order_type,
        "store_id": order.store_id
    }

# Table Booking Routes
@api_router.post("/bookings", response_model=TableBooking)
async def create_booking(request: TableBookingRequest):
    """Create a table booking"""
    booking = TableBooking(**request.dict())
    booking.status = "confirmed"
    await db.bookings.insert_one(booking.dict())
    return booking

@api_router.get("/bookings/{booking_id}", response_model=TableBooking)
async def get_booking(booking_id: str):
    """Get booking by ID"""
    booking_data = await db.bookings.find_one({"id": booking_id})
    if not booking_data:
        raise HTTPException(status_code=404, detail="Booking not found")
    return TableBooking(**booking_data)

@api_router.delete("/bookings/{booking_id}")
async def cancel_booking(booking_id: str):
    """Cancel a booking"""
    result = await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {"status": "cancelled"}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Booking not found")
    return {"message": "Booking cancelled successfully"}

# Favorites Routes
@api_router.post("/favorites", response_model=FavoriteItem)
async def add_favorite(request: FavoriteRequest):
    """Add item to favorites"""
    # Check if already favorited
    existing = await db.favorites.find_one({
        "user_id": request.user_id,
        "item_id": request.item_id
    })
    if existing:
        raise HTTPException(status_code=400, detail="Item already in favorites")
    
    favorite = FavoriteItem(**request.dict())
    await db.favorites.insert_one(favorite.dict())
    return favorite

@api_router.get("/favorites/{user_id}", response_model=List[FavoriteItem])
async def get_favorites(user_id: str):
    """Get user's favorite items"""
    favorites = await db.favorites.find({"user_id": user_id}).to_list(100)
    return [FavoriteItem(**fav) for fav in favorites]

@api_router.delete("/favorites/{user_id}/{item_id}")
async def remove_favorite(user_id: str, item_id: str):
    """Remove item from favorites"""
    result = await db.favorites.delete_one({
        "user_id": user_id,
        "item_id": item_id
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Favorite not found")
    return {"message": "Removed from favorites"}

# Newsletter Routes
@api_router.post("/newsletter/subscribe", response_model=NewsletterSubscription)
async def subscribe_newsletter(request: NewsletterSubscribeRequest):
    """Subscribe to newsletter"""
    existing = await db.newsletter.find_one({"email": request.email})
    if existing:
        if existing.get("is_active"):
            raise HTTPException(status_code=400, detail="Email already subscribed")
        else:
            await db.newsletter.update_one(
                {"email": request.email},
                {"$set": {"is_active": True, "subscribed_at": datetime.utcnow()}}
            )
            return NewsletterSubscription(email=request.email)
    
    subscription = NewsletterSubscription(email=request.email)
    await db.newsletter.insert_one(subscription.dict())
    return subscription

# Contact Routes
@api_router.post("/contact", response_model=ContactRequest)
async def submit_contact(request: ContactRequestCreate):
    """Submit a contact request"""
    contact = ContactRequest(**request.dict())
    await db.contacts.insert_one(contact.dict())
    return contact

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
