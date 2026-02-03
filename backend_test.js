/**
 * Comprehensive Backend API Testing for Naan Staap Restaurant App
 * Tests all backend endpoints for functionality, data integrity, and MongoDB operations
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get backend URL from frontend environment
const getBackendUrl = () => {
  try {
    const envPath = path.join(__dirname, "frontend", ".env");
    const envContent = fs.readFileSync(envPath, "utf8");
    const match = envContent.match(/EXPO_PUBLIC_BACKEND_URL=(.+)/);
    if (match) {
      return match[1].trim();
    }
  } catch (e) {
    console.log(`Error reading frontend .env: ${e.message}`);
  }
  return process.env.BACKEND_URL || "http://localhost:8001";
};

const BASE_URL = getBackendUrl();
const API_BASE = `${BASE_URL}/api`;

console.log("Testing Naan Staap Backend APIs");
console.log(`Backend URL: ${API_BASE}`);
console.log("=".repeat(60));

// Test results tracking
const testResults = [];
const failedTests = [];

const logTest = (testName, success, details = "") => {
  const status = success ? "✅ PASS" : "❌ FAIL";
  console.log(`${status} ${testName}`);
  if (details) {
    console.log(`    ${details}`);
  }

  testResults.push({ test: testName, success, details });

  if (!success) {
    failedTests.push(testName);
  }
};

const testHealthCheck = async () => {
  try {
    const response = await fetch(`${API_BASE}/`);

    if (response.ok) {
      const data = await response.json();
      if (data.message && data.status) {
        logTest("Health Check (GET /api/)", true, `Status: ${data.status}`);
        return true;
      } else {
        logTest(
          "Health Check (GET /api/)",
          false,
          "Missing required fields in response"
        );
        return false;
      }
    } else {
      logTest("Health Check (GET /api/)", false, `HTTP ${response.status}`);
      return false;
    }
  } catch (e) {
    logTest("Health Check (GET /api/)", false, `Exception: ${e.message}`);
    return false;
  }
};

const testMenuCategories = async () => {
  try {
    const response = await fetch(`${API_BASE}/menu/categories`);

    if (response.ok) {
      const categories = await response.json();

      if (categories.length === 7) {
        const expectedCategories = [
          "Naan",
          "Paratha",
          "Curries",
          "Street Food",
          "Snacks",
          "Sweets",
          "Drinks",
        ];
        const categoryNames = categories.map((cat) => cat.name);

        const missingCategories = expectedCategories.filter(
          (cat) => !categoryNames.includes(cat)
        );
        if (missingCategories.length === 0) {
          logTest(
            "Menu Categories (GET /api/menu/categories)",
            true,
            `Found all 7 categories: ${categoryNames.join(", ")}`
          );
          return true;
        } else {
          logTest(
            "Menu Categories (GET /api/menu/categories)",
            false,
            `Missing categories: ${missingCategories.join(", ")}`
          );
          return false;
        }
      } else {
        logTest(
          "Menu Categories (GET /api/menu/categories)",
          false,
          `Expected 7 categories, got ${categories.length}`
        );
        return false;
      }
    } else {
      logTest(
        "Menu Categories (GET /api/menu/categories)",
        false,
        `HTTP ${response.status}`
      );
      return false;
    }
  } catch (e) {
    logTest(
      "Menu Categories (GET /api/menu/categories)",
      false,
      `Exception: ${e.message}`
    );
    return false;
  }
};

const testMenuItems = async () => {
  try {
    const response = await fetch(`${API_BASE}/menu/items`);

    if (response.ok) {
      const items = await response.json();

      if (items.length >= 30) {
        logTest(
          "Menu Items (GET /api/menu/items)",
          true,
          `Found ${items.length} menu items`
        );
        return true;
      } else {
        logTest(
          "Menu Items (GET /api/menu/items)",
          false,
          `Expected at least 30 items, got ${items.length}`
        );
        return false;
      }
    } else {
      logTest(
        "Menu Items (GET /api/menu/items)",
        false,
        `HTTP ${response.status}`
      );
      return false;
    }
  } catch (e) {
    logTest(
      "Menu Items (GET /api/menu/items)",
      false,
      `Exception: ${e.message}`
    );
    return false;
  }
};

const testMenuItemsByCategory = async () => {
  try {
    const response = await fetch(`${API_BASE}/menu/items?category=naan`);

    if (response.ok) {
      const items = await response.json();
      const allNaan = items.every((item) => item.category === "naan");

      if (allNaan && items.length > 0) {
        logTest(
          "Menu Items by Category (GET /api/menu/items?category=naan)",
          true,
          `Found ${items.length} naan items`
        );
        return true;
      } else {
        logTest(
          "Menu Items by Category (GET /api/menu/items?category=naan)",
          false,
          "Category filter not working correctly"
        );
        return false;
      }
    } else {
      logTest(
        "Menu Items by Category (GET /api/menu/items?category=naan)",
        false,
        `HTTP ${response.status}`
      );
      return false;
    }
  } catch (e) {
    logTest(
      "Menu Items by Category (GET /api/menu/items?category=naan)",
      false,
      `Exception: ${e.message}`
    );
    return false;
  }
};

const testPopularItems = async () => {
  try {
    const response = await fetch(`${API_BASE}/menu/items/popular`);

    if (response.ok) {
      const items = await response.json();
      const allPopular = items.every((item) => item.is_popular);

      if (allPopular && items.length > 0) {
        logTest(
          "Popular Items (GET /api/menu/items/popular)",
          true,
          `Found ${items.length} popular items`
        );
        return true;
      } else {
        logTest(
          "Popular Items (GET /api/menu/items/popular)",
          false,
          "Not all items marked as popular"
        );
        return false;
      }
    } else {
      logTest(
        "Popular Items (GET /api/menu/items/popular)",
        false,
        `HTTP ${response.status}`
      );
      return false;
    }
  } catch (e) {
    logTest(
      "Popular Items (GET /api/menu/items/popular)",
      false,
      `Exception: ${e.message}`
    );
    return false;
  }
};

const testMenuSearch = async () => {
  try {
    const response = await fetch(`${API_BASE}/menu/search?q=chicken`);

    if (response.ok) {
      const items = await response.json();

      if (items.length > 0) {
        logTest(
          "Menu Search (GET /api/menu/search?q=chicken)",
          true,
          `Found ${items.length} items matching "chicken"`
        );
        return true;
      } else {
        logTest(
          "Menu Search (GET /api/menu/search?q=chicken)",
          false,
          "No items found for search"
        );
        return false;
      }
    } else {
      logTest(
        "Menu Search (GET /api/menu/search?q=chicken)",
        false,
        `HTTP ${response.status}`
      );
      return false;
    }
  } catch (e) {
    logTest(
      "Menu Search (GET /api/menu/search?q=chicken)",
      false,
      `Exception: ${e.message}`
    );
    return false;
  }
};

const testStores = async () => {
  try {
    const response = await fetch(`${API_BASE}/stores`);

    if (response.ok) {
      const stores = await response.json();

      if (stores.length === 9) {
        logTest("Stores (GET /api/stores)", true, `Found all 9 stores`);
        return true;
      } else {
        logTest(
          "Stores (GET /api/stores)",
          false,
          `Expected 9 stores, got ${stores.length}`
        );
        return false;
      }
    } else {
      logTest("Stores (GET /api/stores)", false, `HTTP ${response.status}`);
      return false;
    }
  } catch (e) {
    logTest("Stores (GET /api/stores)", false, `Exception: ${e.message}`);
    return false;
  }
};

const testChaiItems = async () => {
  try {
    const response = await fetch(`${API_BASE}/chai`);

    if (response.ok) {
      const items = await response.json();

      if (items.length >= 9) {
        logTest(
          "Chai Items (GET /api/chai)",
          true,
          `Found ${items.length} chai items`
        );
        return true;
      } else {
        logTest(
          "Chai Items (GET /api/chai)",
          false,
          `Expected at least 9 chai items, got ${items.length}`
        );
        return false;
      }
    } else {
      logTest("Chai Items (GET /api/chai)", false, `HTTP ${response.status}`);
      return false;
    }
  } catch (e) {
    logTest("Chai Items (GET /api/chai)", false, `Exception: ${e.message}`);
    return false;
  }
};

const testDeals = async () => {
  try {
    const response = await fetch(`${API_BASE}/deals`);

    if (response.ok) {
      const deals = await response.json();

      if (deals.length >= 5) {
        logTest(
          "Deals (GET /api/deals)",
          true,
          `Found ${deals.length} active deals`
        );
        return true;
      } else {
        logTest(
          "Deals (GET /api/deals)",
          false,
          `Expected at least 5 deals, got ${deals.length}`
        );
        return false;
      }
    } else {
      logTest("Deals (GET /api/deals)", false, `HTTP ${response.status}`);
      return false;
    }
  } catch (e) {
    logTest("Deals (GET /api/deals)", false, `Exception: ${e.message}`);
    return false;
  }
};

const testCartOperations = async () => {
  try {
    // Test adding to cart
    const addResponse = await fetch(`${API_BASE}/cart/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        item_id: "1",
        name: "Plain Naan",
        price: 2.5,
        quantity: 2,
        customizations: [],
        special_instructions: "",
      }),
    });

    if (!addResponse.ok) {
      logTest(
        "Cart Add (POST /api/cart/add)",
        false,
        `HTTP ${addResponse.status}`
      );
      return false;
    }

    const cart = await addResponse.json();
    if (!cart.id || !cart.items || cart.items.length === 0) {
      logTest("Cart Add (POST /api/cart/add)", false, "Invalid cart response");
      return false;
    }

    logTest(
      "Cart Add (POST /api/cart/add)",
      true,
      `Created cart ${cart.id} with ${cart.items.length} item(s)`
    );

    // Test getting cart
    const getResponse = await fetch(`${API_BASE}/cart/${cart.id}`);
    if (getResponse.ok) {
      logTest(
        "Cart Get (GET /api/cart/:id)",
        true,
        "Cart retrieved successfully"
      );
    } else {
      logTest(
        "Cart Get (GET /api/cart/:id)",
        false,
        `HTTP ${getResponse.status}`
      );
    }

    // Test clearing cart
    const clearResponse = await fetch(`${API_BASE}/cart/${cart.id}/clear`, {
      method: "DELETE",
    });
    if (clearResponse.ok) {
      logTest(
        "Cart Clear (DELETE /api/cart/:id/clear)",
        true,
        "Cart cleared successfully"
      );
    } else {
      logTest(
        "Cart Clear (DELETE /api/cart/:id/clear)",
        false,
        `HTTP ${clearResponse.status}`
      );
    }

    return true;
  } catch (e) {
    logTest("Cart Operations", false, `Exception: ${e.message}`);
    return false;
  }
};

const testNewsletterSubscription = async () => {
  try {
    const testEmail = `test-${Date.now()}@example.com`;
    const response = await fetch(`${API_BASE}/newsletter/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail }),
    });

    if (response.ok) {
      const subscription = await response.json();
      if (subscription.email === testEmail) {
        logTest(
          "Newsletter Subscribe (POST /api/newsletter/subscribe)",
          true,
          `Subscribed ${testEmail}`
        );
        return true;
      }
    }
    logTest(
      "Newsletter Subscribe (POST /api/newsletter/subscribe)",
      false,
      `HTTP ${response.status}`
    );
    return false;
  } catch (e) {
    logTest(
      "Newsletter Subscribe (POST /api/newsletter/subscribe)",
      false,
      `Exception: ${e.message}`
    );
    return false;
  }
};

const testContactForm = async () => {
  try {
    const response = await fetch(`${API_BASE}/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test User",
        email: "test@example.com",
        phone: "+44 123 456 7890",
        subject: "Test Subject",
        message: "This is a test message",
      }),
    });

    if (response.ok) {
      const contact = await response.json();
      if (contact.id) {
        logTest(
          "Contact Form (POST /api/contact)",
          true,
          `Contact submitted with ID ${contact.id}`
        );
        return true;
      }
    }
    logTest(
      "Contact Form (POST /api/contact)",
      false,
      `HTTP ${response.status}`
    );
    return false;
  } catch (e) {
    logTest(
      "Contact Form (POST /api/contact)",
      false,
      `Exception: ${e.message}`
    );
    return false;
  }
};

// Run all tests
const runAllTests = async () => {
  console.log("\n📋 Starting API Tests...\n");

  await testHealthCheck();
  await testMenuCategories();
  await testMenuItems();
  await testMenuItemsByCategory();
  await testPopularItems();
  await testMenuSearch();
  await testStores();
  await testChaiItems();
  await testDeals();
  await testCartOperations();
  await testNewsletterSubscription();
  await testContactForm();

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 TEST SUMMARY");
  console.log("=".repeat(60));

  const passed = testResults.filter((r) => r.success).length;
  const failed = testResults.filter((r) => !r.success).length;
  const total = testResults.length;

  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

  if (failedTests.length > 0) {
    console.log("\n❌ Failed Tests:");
    failedTests.forEach((test) => console.log(`   - ${test}`));
  }

  console.log("\n" + "=".repeat(60));

  process.exit(failed > 0 ? 1 : 0);
};

runAllTests();
