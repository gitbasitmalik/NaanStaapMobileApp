#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Naan Staap Restaurant App
Tests all backend endpoints for functionality, data integrity, and MongoDB operations
"""

import requests
import json
import sys
import os
from datetime import datetime

# Get backend URL from frontend environment
def get_backend_url():
    try:
        with open('/app/frontend/.env', 'r') as f:
            for line in f:
                if line.startswith('EXPO_PUBLIC_BACKEND_URL='):
                    return line.split('=', 1)[1].strip()
    except Exception as e:
        print(f"Error reading frontend .env: {e}")
        return None

BASE_URL = get_backend_url()
if not BASE_URL:
    print("ERROR: Could not get backend URL from frontend/.env")
    sys.exit(1)

API_BASE = f"{BASE_URL}/api"

print(f"Testing Naan Staap Backend APIs")
print(f"Backend URL: {API_BASE}")
print("=" * 60)

# Test results tracking
test_results = []
failed_tests = []

def log_test(test_name, success, details=""):
    """Log test results"""
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status} {test_name}")
    if details:
        print(f"    {details}")
    
    test_results.append({
        'test': test_name,
        'success': success,
        'details': details
    })
    
    if not success:
        failed_tests.append(test_name)

def test_health_check():
    """Test GET /api/ - Health check"""
    try:
        response = requests.get(f"{API_BASE}/", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if "message" in data and "status" in data:
                log_test("Health Check (GET /api/)", True, f"Status: {data.get('status')}")
                return True
            else:
                log_test("Health Check (GET /api/)", False, "Missing required fields in response")
                return False
        else:
            log_test("Health Check (GET /api/)", False, f"HTTP {response.status_code}")
            return False
            
    except Exception as e:
        log_test("Health Check (GET /api/)", False, f"Exception: {str(e)}")
        return False

def test_menu_categories():
    """Test GET /api/menu/categories - Should return 7 categories"""
    try:
        response = requests.get(f"{API_BASE}/menu/categories", timeout=10)
        
        if response.status_code == 200:
            categories = response.json()
            
            if len(categories) == 7:
                expected_categories = ["Naan", "Paratha", "Curries", "Street Food", "Snacks", "Sweets", "Drinks"]
                category_names = [cat.get('name') for cat in categories]
                
                missing_categories = [cat for cat in expected_categories if cat not in category_names]
                if not missing_categories:
                    log_test("Menu Categories (GET /api/menu/categories)", True, f"Found all 7 categories: {', '.join(category_names)}")
                    return True
                else:
                    log_test("Menu Categories (GET /api/menu/categories)", False, f"Missing categories: {missing_categories}")
                    return False
            else:
                log_test("Menu Categories (GET /api/menu/categories)", False, f"Expected 7 categories, got {len(categories)}")
                return False
        else:
            log_test("Menu Categories (GET /api/menu/categories)", False, f"HTTP {response.status_code}")
            return False
            
    except Exception as e:
        log_test("Menu Categories (GET /api/menu/categories)", False, f"Exception: {str(e)}")
        return False

def test_menu_items():
    """Test GET /api/menu/items - Get all menu items"""
    try:
        response = requests.get(f"{API_BASE}/menu/items", timeout=10)
        
        if response.status_code == 200:
            items = response.json()
            
            if len(items) > 0:
                # Check if items have required fields
                sample_item = items[0]
                required_fields = ['id', 'name', 'description', 'category', 'image_url']
                missing_fields = [field for field in required_fields if field not in sample_item]
                
                if not missing_fields:
                    log_test("Menu Items (GET /api/menu/items)", True, f"Found {len(items)} menu items with correct structure")
                    return True
                else:
                    log_test("Menu Items (GET /api/menu/items)", False, f"Missing fields in items: {missing_fields}")
                    return False
            else:
                log_test("Menu Items (GET /api/menu/items)", False, "No menu items returned")
                return False
        else:
            log_test("Menu Items (GET /api/menu/items)", False, f"HTTP {response.status_code}")
            return False
            
    except Exception as e:
        log_test("Menu Items (GET /api/menu/items)", False, f"Exception: {str(e)}")
        return False

def test_menu_items_filter():
    """Test GET /api/menu/items?category=naan - Filter by category"""
    try:
        response = requests.get(f"{API_BASE}/menu/items?category=naan", timeout=10)
        
        if response.status_code == 200:
            items = response.json()
            
            if len(items) > 0:
                # Check if all items are naan category
                non_naan_items = [item for item in items if item.get('category') != 'naan']
                
                if not non_naan_items:
                    log_test("Menu Items Filter (GET /api/menu/items?category=naan)", True, f"Found {len(items)} naan items")
                    return True
                else:
                    log_test("Menu Items Filter (GET /api/menu/items?category=naan)", False, f"Found {len(non_naan_items)} non-naan items in filtered results")
                    return False
            else:
                log_test("Menu Items Filter (GET /api/menu/items?category=naan)", False, "No naan items returned")
                return False
        else:
            log_test("Menu Items Filter (GET /api/menu/items?category=naan)", False, f"HTTP {response.status_code}")
            return False
            
    except Exception as e:
        log_test("Menu Items Filter (GET /api/menu/items?category=naan)", False, f"Exception: {str(e)}")
        return False

def test_popular_items():
    """Test GET /api/menu/items/popular - Get popular items only"""
    try:
        response = requests.get(f"{API_BASE}/menu/items/popular", timeout=10)
        
        if response.status_code == 200:
            items = response.json()
            
            if len(items) > 0:
                # Check if all items are marked as popular
                non_popular_items = [item for item in items if not item.get('is_popular', False)]
                
                if not non_popular_items:
                    log_test("Popular Items (GET /api/menu/items/popular)", True, f"Found {len(items)} popular items")
                    return True
                else:
                    log_test("Popular Items (GET /api/menu/items/popular)", False, f"Found {len(non_popular_items)} non-popular items in results")
                    return False
            else:
                log_test("Popular Items (GET /api/menu/items/popular)", False, "No popular items returned")
                return False
        else:
            log_test("Popular Items (GET /api/menu/items/popular)", False, f"HTTP {response.status_code}")
            return False
            
    except Exception as e:
        log_test("Popular Items (GET /api/menu/items/popular)", False, f"Exception: {str(e)}")
        return False

def test_stores():
    """Test GET /api/stores - Should return 9 store locations"""
    try:
        response = requests.get(f"{API_BASE}/stores", timeout=10)
        
        if response.status_code == 200:
            stores = response.json()
            
            if len(stores) == 9:
                # Check if stores have required fields
                sample_store = stores[0]
                required_fields = ['id', 'name', 'address', 'phone', 'city', 'postcode']
                missing_fields = [field for field in required_fields if field not in sample_store]
                
                if not missing_fields:
                    store_names = [store.get('name') for store in stores]
                    log_test("Stores (GET /api/stores)", True, f"Found all 9 stores: {', '.join(store_names)}")
                    return True
                else:
                    log_test("Stores (GET /api/stores)", False, f"Missing fields in stores: {missing_fields}")
                    return False
            else:
                log_test("Stores (GET /api/stores)", False, f"Expected 9 stores, got {len(stores)}")
                return False
        else:
            log_test("Stores (GET /api/stores)", False, f"HTTP {response.status_code}")
            return False
            
    except Exception as e:
        log_test("Stores (GET /api/stores)", False, f"Exception: {str(e)}")
        return False

def test_chai_items():
    """Test GET /api/chai - Get all chai varieties"""
    try:
        response = requests.get(f"{API_BASE}/chai", timeout=10)
        
        if response.status_code == 200:
            chai_items = response.json()
            
            if len(chai_items) > 0:
                # Check if chai items have required fields
                sample_chai = chai_items[0]
                required_fields = ['id', 'name', 'description', 'image_url']
                missing_fields = [field for field in required_fields if field not in sample_chai]
                
                if not missing_fields:
                    log_test("Chai Items (GET /api/chai)", True, f"Found {len(chai_items)} chai varieties")
                    return True
                else:
                    log_test("Chai Items (GET /api/chai)", False, f"Missing fields in chai items: {missing_fields}")
                    return False
            else:
                log_test("Chai Items (GET /api/chai)", False, "No chai items returned")
                return False
        else:
            log_test("Chai Items (GET /api/chai)", False, f"HTTP {response.status_code}")
            return False
            
    except Exception as e:
        log_test("Chai Items (GET /api/chai)", False, f"Exception: {str(e)}")
        return False

def test_signature_chai():
    """Test GET /api/chai/signature - Get signature chai items"""
    try:
        response = requests.get(f"{API_BASE}/chai/signature", timeout=10)
        
        if response.status_code == 200:
            signature_chai = response.json()
            
            if len(signature_chai) > 0:
                # Check if all items are marked as signature
                non_signature_items = [item for item in signature_chai if not item.get('is_signature', False)]
                
                if not non_signature_items:
                    chai_names = [chai.get('name') for chai in signature_chai]
                    log_test("Signature Chai (GET /api/chai/signature)", True, f"Found {len(signature_chai)} signature chai: {', '.join(chai_names)}")
                    return True
                else:
                    log_test("Signature Chai (GET /api/chai/signature)", False, f"Found {len(non_signature_items)} non-signature items in results")
                    return False
            else:
                log_test("Signature Chai (GET /api/chai/signature)", False, "No signature chai items returned")
                return False
        else:
            log_test("Signature Chai (GET /api/chai/signature)", False, f"HTTP {response.status_code}")
            return False
            
    except Exception as e:
        log_test("Signature Chai (GET /api/chai/signature)", False, f"Exception: {str(e)}")
        return False

def test_newsletter_subscribe():
    """Test POST /api/newsletter/subscribe - Subscribe to newsletter"""
    try:
        # Use a unique email for testing
        test_email = f"test{datetime.now().strftime('%Y%m%d%H%M%S')}@example.com"
        payload = {"email": test_email}
        
        response = requests.post(f"{API_BASE}/newsletter/subscribe", 
                               json=payload, 
                               headers={'Content-Type': 'application/json'},
                               timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            
            if data.get('email') == test_email and 'id' in data:
                log_test("Newsletter Subscribe (POST /api/newsletter/subscribe)", True, f"Successfully subscribed {test_email}")
                return True
            else:
                log_test("Newsletter Subscribe (POST /api/newsletter/subscribe)", False, "Invalid response structure")
                return False
        else:
            log_test("Newsletter Subscribe (POST /api/newsletter/subscribe)", False, f"HTTP {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        log_test("Newsletter Subscribe (POST /api/newsletter/subscribe)", False, f"Exception: {str(e)}")
        return False

def test_contact_form():
    """Test POST /api/contact - Submit contact form"""
    try:
        # Use realistic test data
        payload = {
            "name": "Rajesh Kumar",
            "email": f"rajesh.kumar{datetime.now().strftime('%H%M%S')}@test.com",
            "phone": "+441234567890",
            "subject": "Menu Inquiry",
            "message": "I would like to know more about your halal certification and ingredients used in your naan breads."
        }
        
        response = requests.post(f"{API_BASE}/contact", 
                               json=payload, 
                               headers={'Content-Type': 'application/json'},
                               timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            
            required_fields = ['id', 'name', 'email', 'phone', 'subject', 'message', 'created_at']
            missing_fields = [field for field in required_fields if field not in data]
            
            if not missing_fields and data.get('name') == payload['name']:
                log_test("Contact Form (POST /api/contact)", True, f"Successfully submitted contact from {payload['name']}")
                return True
            else:
                log_test("Contact Form (POST /api/contact)", False, f"Missing fields or data mismatch: {missing_fields}")
                return False
        else:
            log_test("Contact Form (POST /api/contact)", False, f"HTTP {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        log_test("Contact Form (POST /api/contact)", False, f"Exception: {str(e)}")
        return False

def run_all_tests():
    """Run all backend API tests"""
    print("Starting comprehensive backend API testing...\n")
    
    # Run all tests
    tests = [
        test_health_check,
        test_menu_categories,
        test_menu_items,
        test_menu_items_filter,
        test_popular_items,
        test_stores,
        test_chai_items,
        test_signature_chai,
        test_newsletter_subscribe,
        test_contact_form
    ]
    
    for test_func in tests:
        test_func()
        print()  # Add spacing between tests
    
    # Summary
    print("=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    
    passed = len([t for t in test_results if t['success']])
    total = len(test_results)
    
    print(f"Total Tests: {total}")
    print(f"Passed: {passed}")
    print(f"Failed: {total - passed}")
    
    if failed_tests:
        print(f"\nFailed Tests:")
        for test in failed_tests:
            print(f"  - {test}")
    
    print(f"\nOverall Success Rate: {(passed/total)*100:.1f}%")
    
    return len(failed_tests) == 0

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)