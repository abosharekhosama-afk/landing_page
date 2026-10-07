import React from "react";
import Footer from "./components/Footer.jsx";
import Header from "./components/Header.jsx";
import AboutPage from "./pages/AboutPage.jsx";
import SustainabilityPage from "./pages/SustainabilityPage.jsx";
import AccountPage from "./pages/AccountPage.jsx";
import AdminCompaniesPage from "./pages/AdminCompaniesPage.jsx";
import AdminDashboardPage from "./pages/AdminDashboardPage.jsx";
import AdminEmployeesPage from "./pages/AdminEmployeesPage.jsx";
import CartPage from "./pages/CartPage.jsx";
import CheckoutPage from "./pages/CheckoutPage.jsx";
import CleanupsPage from "./pages/CleanupsPage.jsx";
import EmployeeDashboardPage from "./pages/EmployeeDashboardPage.jsx";
import EBPointsPage from "./pages/EBPointsPage.jsx";
import FollowUsPage from "./pages/FollowUsPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import MerchantStorefrontPage from "./pages/VelvetDropshipping/MerchantStorefrontPage.jsx";
import HowItWorksPage from "./pages/HowItWorksPage.jsx";
import AdminLoginPage from "./pages/AdminLoginPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import BundleDetailsPage from "./pages/BundleDetailsPage.jsx";
import BundlesPage from "./pages/BundlesPage.jsx";
import ProductDetailsPage from "./pages/ProductDetailsPage.jsx";
import ProductsPage from "./pages/ProductsPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import StorePolicyPage from "./pages/StorePolicyPage.jsx";
import BusinessLegalInformationPage from "./pages/BusinessLegalInformationPage.jsx";
import AnnouncementBar from "./components/AnnouncementBar.jsx";
import SplashAdGallery from "./components/SplashAdGallery.jsx";
import { fetchPublicStorefrontContent } from "./utils/storefrontContentApi.js";
import { getStorefrontAttribution, getStorefrontSessionKey, trackStorefrontEvent } from "./utils/storefrontAnalytics.js";
import { isStorefrontDisplayExcluded } from "./utils/storefrontDisplayRules.js";
import { applyStorefrontSeoMeta } from "./utils/companyContext.js";

import { products as initialProducts } from "./data/products.js";
import { hasPermission } from "./data/permissions.js";
import { createTranslator } from "./data/translations.js";
import {
  fetchCurrentUser,
  getCurrentUser,
  loginUser,
  logoutUser,
  registerCustomer,
  setCurrentUser,
} from "./utils/auth.js";
import {
  assignOrderEmployee,
  createOrder,
  deleteOrder,
  getOrders,
  updateOrderStatus,
} from "./utils/orders.js";
import {
  createEmployee as createEmployeeApi,
  deleteEmployee as deleteEmployeeApi,
  fetchEmployees,
  updateEmployee as updateEmployeeApi,
  updateEmployeeStatus,
} from "./utils/employeesApi.js";
import {
  fetchEmployeeWorkSessions,
  fetchMyTodayWorkSession,
} from "./utils/workSessionsApi.js";
import {
  createProduct as createProductApi,
  deleteProduct as deleteProductApi,
  fetchProducts,
  updateProduct as updateProductApi,
} from "./utils/productsApi.js";
import { cartSubtotal, reconcileCartPrices } from "./utils/cartPricing.js";
import {
  deleteHomepageOffer,
  deleteReview as deleteReviewApi,
  fetchAllHomepageCategoryCards,
  fetchAllHomepageOffers,
  fetchAllReviews,
  fetchHomepageCategoryCards,
  fetchHomepageStoreReviews,
  fetchStorefrontHomepageOffers,
  saveHomepageCategoryCard,
  saveHomepageOffer,
  submitCustomerReview,
  updateReviewStatus,
} from "./utils/homeContentApi.js";
import {
  clearWebsiteMediaCache,
  deleteWebsiteMedia as deleteWebsiteMediaApi,
  fetchAllWebsiteMedia,
  fetchWebsiteMedia,
  saveWebsiteMedia as saveWebsiteMediaApi,
} from "./utils/websiteMediaApi.js";
import {
  isCompanyAdmin,
  isPlatformAdmin,
  isPlatformPage,
  isStaffRole,
  isTenantOperator,
} from "./utils/roles.js";
import "./styles/global.css";

const cartStorageKey = "epChemicalCart";
const languageStorageKey = "epChemicalLanguage";
const pagePaths = {
  home: "/",
  products: "/products",
  bundles: "/bundles",
  "bundle-detail": "/bundles/:slug",
  about: "/about",
  sustainability: "/sustainability",
  how: "/how-it-works",
  cleanups: "/cleanups",
  "eb-points": "/eb-points",
  social: "/follow-us",
  "follow-us": "/follow-us",
  login: "/login",
  "admin-login": "/admin/login",
  register: "/register",
  account: "/account",
  cart: "/cart",
  checkout: "/checkout",
  policy: "/policies",
  "legal-information": "/business-information",
  admin: "/admin/dashboard",
  "admin-sms": "/admin/sms",
  "admin-announcements": "/admin/announcements",
  "admin-splash-ads": "/admin/splash-ads",
  "admin-policies": "/admin/policies",
  "admin-legal-information": "/admin/legal-information",
  "admin-banners": "/admin/banners",
  "admin-security": "/admin/security",
  "admin-platform-companies": "/admin/platform/companies",
  "admin-products": "/admin/products",
  "admin-products-new": "/admin/products/new",
  "admin-categories": "/admin/categories",
  "admin-categories-new": "/admin/categories/new",
  "admin-brands": "/admin/brands",
  "admin-brands-new": "/admin/brands/new",
  "admin-vlogs": "/admin/vlogs",
  "admin-vlogs-new": "/admin/vlogs/new",
  "admin-store-locator": "/admin/store-locator",
  "admin-store-locator-new": "/admin/store-locator/new",
  "admin-website-media": "/admin/website-media",
  "admin-orders": "/admin/orders",
  "admin-reviews": "/admin/reviews",
  "admin-inventory": "/admin/inventory",
  "admin-customers": "/admin/customers",
  "admin-staff": "/admin/staff",
  "admin-staff-new": "/admin/staff/new",
  "admin-employees": "/admin/staff",
  "admin-settings": "/admin/settings",
  employee: "/employee",
};

const adminPageKeys = [
  "admin",
  "admin-platform-companies",
  "admin-products",
  "admin-products-new",
  "admin-categories",
  "admin-categories-new",
  "admin-brands",
  "admin-brands-new",
  "admin-vlogs",
  "admin-vlogs-new",
  "admin-store-locator",
  "admin-store-locator-new",
  "admin-website-media",
  "admin-orders",
  "admin-reviews",
  "admin-inventory",
  "admin-customers",
  "admin-staff",
  "admin-staff-new",
  "admin-employees",
  "admin-settings",
  "admin-sms",
  "admin-announcements",
  "admin-splash-ads",
  "admin-policies",
  "admin-legal-information",
  "admin-banners",
  "admin-security",
];

function getInitialPageFromPath() {
  const pathname = window.location.pathname;
  if (pathname === "/admin") return "admin";
  if (pathname === "/admin/dashboard") return "admin";
  if (pathname === "/staff") return "employee";
  if (/^\/policies\/[^/]+$/.test(pathname)) return "policy";
  if (/^\/bundles\/[^/]+$/.test(pathname)) return "bundle-detail";
  if (pathname === "/business-information") return "legal-information";
  if (/^\/store\/[^/]+$/.test(pathname)) return "velvet-store";
  const entry = Object.entries(pagePaths).find(([, path]) => path === pathname);
  return entry?.[0] || "home";
}

function getStoredCart() {
  try {
    const storedCart = localStorage.getItem(cartStorageKey);
    return storedCart ? JSON.parse(storedCart) : [];
  } catch (error) {
    return [];
  }
}

function mergeCatalogDetails(products) {
  return products.map((product) => {
    const localProduct = initialProducts.find((item) => item.id === product.id || item.slug === product.slug);
    return localProduct ? { ...localProduct, ...product } : product;
  });
}

function App() {
  const [activePage, setActivePage] = React.useState(getInitialPageFromPath);
  const [activePolicyId, setActivePolicyId] = React.useState(() => {
    const match = window.location.pathname.match(/^\/policies\/([^/]+)$/);
    return match ? decodeURIComponent(match[1]) : "";
  });
  const [storefrontContent, setStorefrontContent] = React.useState({
    site: null,
    announcements: [],
    splashAds: [],
    policies: [],
    legalInformation: null,
    displayRules: { excludedPages: [] },
  });
  const [activeCategory, setActiveCategory] = React.useState("All");
  const [activeProductSlug, setActiveProductSlug] = React.useState("");
  const [activeBundleSlug, setActiveBundleSlug] = React.useState(() => {
    const match = window.location.pathname.match(/^\/bundles\/([^/]+)$/);
    return match ? decodeURIComponent(match[1]) : "";
  });
  const [cartItems, setCartItems] = React.useState(getStoredCart);
  const [catalogReady, setCatalogReady] = React.useState(false);
  const [demoProducts, setDemoProducts] = React.useState(initialProducts);
  const [employees, setEmployees] = React.useState([]);
  const [orders, setOrders] = React.useState([]);
  const [workSession, setWorkSession] = React.useState(null);
  const [employeeSessions, setEmployeeSessions] = React.useState([]);
  const [homepageOffers, setHomepageOffers] = React.useState([]);
  const [homepageOffersStatus, setHomepageOffersStatus] = React.useState("loading");
  const [homepageCategoryCards, setHomepageCategoryCards] = React.useState([]);
  const [reviews, setReviews] = React.useState([]);
  const [websiteMedia, setWebsiteMedia] = React.useState([]);
  const [currentUser, setUser] = React.useState(getCurrentUser);
  const [loginMessage, setLoginMessage] = React.useState("");
  const [adminLoginMessage, setAdminLoginMessage] = React.useState("");
  const [registerMessage, setRegisterMessage] = React.useState("");
  const [adminMessage, setAdminMessage] = React.useState("");
  const [checkoutMessage, setCheckoutMessage] = React.useState("");
  const [lastOrder, setLastOrder] = React.useState(null);
  const [language, setLanguage] = React.useState(
    () => localStorage.getItem(languageStorageKey) || "en"
  );
  const [isAdminDarkMode, setIsAdminDarkMode] = React.useState(
    () => localStorage.getItem("epChemicalAdminDarkMode") === "true"
  );
  const t = React.useMemo(() => createTranslator(language), [language]);

  React.useEffect(() => {
    localStorage.setItem(cartStorageKey, JSON.stringify(cartItems));
  }, [cartItems]);

  // Funnel events are emitted from the committed cart state, so a cart action
  // is only counted after it actually succeeded (added or removed item).
  const previousCartRef = React.useRef(cartItems);

  React.useEffect(() => {
    const previousItems = previousCartRef.current;
    previousCartRef.current = cartItems;
    if (previousItems === cartItems) return;

    const previousIds = new Set(previousItems.map((item) => item.cartId));
    const currentIds = new Set(cartItems.map((item) => item.cartId));

    cartItems.forEach((item) => {
      if (!previousIds.has(item.cartId)) {
        trackStorefrontEvent("add_to_cart", { productId: item.productId || item.bundleId || "" });
      }
    });
    previousItems.forEach((item) => {
      if (!currentIds.has(item.cartId)) {
        trackStorefrontEvent("remove_from_cart", { productId: item.productId || item.bundleId || "" });
      }
    });
  }, [cartItems]);

  // Checkout start is recorded once per checkout attempt with a non-empty cart.
  const checkoutTrackedRef = React.useRef(false);

  React.useEffect(() => {
    if (activePage !== "checkout" || cartItems.length === 0) {
      checkoutTrackedRef.current = false;
      return;
    }
    if (checkoutTrackedRef.current) return;
    checkoutTrackedRef.current = true;
    trackStorefrontEvent("initiate_checkout", { path: "/checkout" });
  }, [activePage, cartItems.length]);

  const isCartView = activePage === "cart" || activePage === "checkout";

  React.useEffect(() => {
    if (!catalogReady || !isCartView) return;
    const nextCartItems = reconcileCartPrices(cartItems, demoProducts);
    if (nextCartItems !== cartItems) {
      setCartItems(nextCartItems);
    }
  }, [cartItems, catalogReady, demoProducts, isCartView]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const page = activePage === "home"
          ? "/"
          : activePage === "policy"
            ? window.location.pathname
            : `/${activePage}`;
        const data = await fetchPublicStorefrontContent({ page, locale: language });
        if (cancelled) return;
        setStorefrontContent({
          site: data.site || null,
          announcements: data.announcements || [],
          splashAds: data.splashAds || [],
          policies: data.policies || [],
          legalInformation: data.legalInformation || null,
          displayRules: data.displayRules || { excludedPages: [] },
        });
        applyStorefrontSeoMeta({ site: data.site || null });
      } catch {
        if (cancelled) return;
        setStorefrontContent((current) => ({
          ...current,
          announcements: [],
          splashAds: [],
          policies: [],
          legalInformation: null,
        }));
        applyStorefrontSeoMeta({ site: null });
      }
    })();
    return () => { cancelled = true; };
  }, [activePage, language]);

  React.useEffect(() => {
    loadProducts();
    loadHomeContent();
    loadWebsiteMedia();
    hydrateUser();
  }, []);

  React.useEffect(() => {
    function handlePopState() {
      setActivePage(getInitialPageFromPath());
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  React.useEffect(() => {
    loadOrders(currentUser);
    loadEmployees(currentUser);
    if (isCompanyAdmin(currentUser?.role)) {
      loadReviews(currentUser);
    }
    loadWorkSession(currentUser);
    loadWebsiteMedia(currentUser);
  }, [currentUser]);

  React.useEffect(() => {
    const portalPages = [...adminPageKeys, "employee"];

    if (activePage === "admin-login" && currentUser) {
      if (isPlatformAdmin(currentUser.role)) {
        navigate("admin-platform-companies");
      } else if (isTenantOperator(currentUser.role)) {
        navigate("admin");
      } else if (isStaffRole(currentUser.role)) {
        navigate("employee");
      } else {
        setAdminLoginMessage(t("adminLogin.staffOnly"));
      }
      return;
    }

    if (portalPages.includes(activePage) && !currentUser) {
      setAdminLoginMessage(t("adminLogin.loginRequired"));
      navigate("admin-login", { preserveAdminLoginMessage: true });
      return;
    }

    if (portalPages.includes(activePage) && currentUser?.role === "customer") {
      setAdminLoginMessage(t("adminLogin.staffOnly"));
      navigate("admin-login", { preserveAdminLoginMessage: true });
      return;
    }

    if (adminPageKeys.includes(activePage) && currentUser) {
      if (isPlatformPage(activePage) && !isPlatformAdmin(currentUser.role)) {
        navigate(isTenantOperator(currentUser.role) ? "admin" : "admin-login");
      } else if (!isPlatformPage(activePage) && !isTenantOperator(currentUser.role)) {
        navigate(isPlatformAdmin(currentUser.role) ? "admin-platform-companies" : "admin-login");
      }
    }
  }, [activePage, currentUser, t]);

  React.useEffect(() => {
    localStorage.setItem(languageStorageKey, language);
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);

  React.useEffect(() => {
    localStorage.setItem("epChemicalAdminDarkMode", String(isAdminDarkMode));
  }, [isAdminDarkMode]);

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cartSubtotal(cartItems);

  async function loadProducts() {
    try {
      setDemoProducts(mergeCatalogDetails(await fetchProducts()));
      setCatalogReady(true);
    } catch (error) {
      setAdminMessage(error.message);
    }
  }

  async function refreshProducts() {
    try {
      const products = mergeCatalogDetails(await fetchProducts());
      setDemoProducts(products);
      setCatalogReady(true);
      return products;
    } catch (error) {
      setAdminMessage(error.message);
      return demoProducts;
    }
  }

  async function hydrateUser() {
    try {
      setUser(await fetchCurrentUser());
    } catch (error) {
      setCurrentUser(null);
      setUser(null);
    }
  }

  async function loadOrders(user) {
    if (!user) {
      setOrders([]);
      return;
    }

    try {
      setOrders(await getOrders(user));
    } catch (error) {
      setOrders([]);
    }
  }

  async function refreshOrders(user = currentUser) {
    if (!user) {
      setOrders([]);
      return [];
    }

    try {
      const nextOrders = await getOrders(user);
      setOrders(nextOrders);
      return nextOrders;
    } catch (error) {
      setOrders([]);
      return [];
    }
  }

  async function loadEmployees(user) {
    if (!isCompanyAdmin(user?.role)) {
      setEmployees([]);
      return;
    }

    try {
      setEmployees(await fetchEmployees());
    } catch (error) {
      setEmployees([]);
    }
  }

  async function refreshEmployees() {
    try {
      const nextEmployees = await fetchEmployees();
      setEmployees(nextEmployees);
      return nextEmployees;
    } catch (error) {
      setAdminMessage(error.message);
      return employees;
    }
  }

  async function loadWorkSession(user) {
    if (!user) {
      setWorkSession(null);
      setEmployeeSessions([]);
      return;
    }

    try {
      if (isStaffRole(user.role)) {
        setWorkSession(await fetchMyTodayWorkSession());
      }

      if (isCompanyAdmin(user.role)) {
        setEmployeeSessions(await fetchEmployeeWorkSessions());
      }
    } catch (error) {
      if (isStaffRole(user.role)) {
        setWorkSession(null);
      }
      if (isCompanyAdmin(user.role)) {
        setEmployeeSessions([]);
      }
    }
  }

  async function loadHomeContent() {
    setHomepageOffersStatus("loading");
    try {
      setHomepageOffers(await fetchStorefrontHomepageOffers());
      setHomepageOffersStatus("ready");
    } catch (error) {
      setHomepageOffers([]);
      setHomepageOffersStatus("error");
    }
    setHomepageCategoryCards(await fetchHomepageCategoryCards());
    try {
      setReviews(await fetchHomepageStoreReviews());
    } catch (error) {
      setReviews([]);
    }
  }

  async function loadWebsiteMedia(user = null) {
    try {
      clearWebsiteMediaCache();
      const canManage = user && hasPermission(user, "website_media.manage");
      setWebsiteMedia(canManage ? await fetchAllWebsiteMedia() : await fetchWebsiteMedia());
    } catch {
      setWebsiteMedia(await fetchWebsiteMedia());
    }
  }

  async function loadReviews(user) {
    if (!user) return;
    setReviews(await fetchAllReviews());
    if (isCompanyAdmin(user.role) || isStaffRole(user.role)) {
      setHomepageOffers(await fetchAllHomepageOffers());
      setHomepageCategoryCards(await fetchAllHomepageCategoryCards());
    }
  }

  function navigate(page, options = {}) {
    setLoginMessage("");
    if (!options.preserveAdminLoginMessage) {
      setAdminLoginMessage("");
    }
    setRegisterMessage("");
    setAdminMessage("");
    setCheckoutMessage("");
    if (options.slug) {
      setActiveProductSlug(options.slug);
    }
    if (options.bundleSlug) {
      setActiveBundleSlug(options.bundleSlug);
    }
    if (options.policyId) setActivePolicyId(options.policyId);
    setActivePage(page);
    const nextPath = options.policyId
      ? `/policies/${encodeURIComponent(options.policyId)}`
      : options.bundleSlug
        ? `/bundles/${encodeURIComponent(options.bundleSlug)}`
        : pagePaths[page];
    if (nextPath && window.location.pathname !== nextPath) {
      window.history.pushState({}, "", nextPath);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleCategorySelect(categoryName) {
    setActiveCategory(categoryName);
    navigate("products");
  }

  function handleViewProduct(slug) {
    setActiveProductSlug(slug);
    navigate("product");
  }

  function handleViewBundle(slug) {
    setActiveBundleSlug(slug);
    navigate("bundle-detail", { bundleSlug: slug });
  }

  function handleAddBundle(bundle) {
    if (!currentUser) {
      setLoginMessage(t("auth.loginRequiredToBuy"));
      navigate("login");
      return;
    }

    const cartId = `bundle-${bundle.id}`;

    setCartItems((currentItems) => {
      const existingItem = currentItems.find((item) => item.cartId === cartId);

      if (existingItem) {
        return currentItems.map((item) =>
          item.cartId === cartId
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item
        );
      }

      return [
        ...currentItems,
        {
          cartId,
          type: "bundle",
          bundleId: bundle.id,
          bundleSlug: bundle.slug,
          productName: bundle.name,
          price: bundle.finalPrice,
          quantity: 1,
          image: bundle.imageUrl,
          size: "Bundle",
          bundleComponents: (bundle.items || []).map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            slug: item.slug,
            productName: item.productName,
            size: item.size,
            colorName: item.colorName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
          })),
        },
      ];
    });
  }

  function handleAddToCart(product, size, variant = null) {
    if (!currentUser) {
      setLoginMessage(t("auth.loginRequiredToBuy"));
      navigate("login");
      return;
    }

    const selectedSize =
      variant ||
      product.variants?.find((option) => option.size === size) ||
      product.sizes?.find((option) => option.size === size);

    if (!selectedSize) {
      return;
    }

    const selectedVariantId = variant?.id || selectedSize.id || "";
    const cartId = `${product.id}-${selectedVariantId || selectedSize.size}`;

    setCartItems((currentItems) => {
      const existingItem = currentItems.find((item) => item.cartId === cartId);

      if (existingItem) {
        return currentItems.map((item) =>
          item.cartId === cartId
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item
        );
      }

      return [
        ...currentItems,
        {
          cartId,
          productId: product.id,
          slug: product.slug,
          categoryId: product.categoryId,
          productName: product.name?.en || product.slug,
          image: variant?.image || variant?.image_url || product.image,
          fallbackImage: product.fallbackImage,
          size: selectedSize.size,
          selectedSize: selectedSize.size,
          variantId: selectedVariantId,
          colorName: variant?.colorName || variant?.color_name || selectedSize.colorName || selectedSize.color_name || "",
          colorValue: variant?.colorValue || variant?.color_value || selectedSize.colorValue || selectedSize.color_value || "",
          price: selectedSize.price,
          quantity: 1,
        },
      ];
    });
  }

  function handleUpdateQuantity(cartId, quantity) {
    if (quantity <= 0) {
      handleRemoveItem(cartId);
      return;
    }

    setCartItems((currentItems) =>
      currentItems.map((item) =>
        item.cartId === cartId
          ? {
              ...item,
              quantity,
            }
          : item
      )
    );
  }

  function handleRemoveItem(cartId) {
    setCartItems((currentItems) =>
      currentItems.filter((item) => item.cartId !== cartId)
    );
  }

  const activeDemoProduct = demoProducts.find(
    (product) => product.slug === activeProductSlug
  );

  async function handleLogin(credentials) {
    try {
      const session = await loginUser(credentials.email, credentials.password);
      setUser(session.user);
      setWorkSession(session.workSession || null);
      navigate(
        isPlatformAdmin(session.user.role)
          ? "admin-platform-companies"
          : isTenantOperator(session.user.role)
          ? "admin"
          : isStaffRole(session.user.role)
            ? "employee"
            : "account"
      );
    } catch (error) {
      setLoginMessage(error.message || t("auth.loginFailed"));
    }
  }

  async function handleAdminLogin(credentials) {
    try {
      const session = await loginUser(credentials.email, credentials.password);
      const role = session.user?.role;

      if (isPlatformAdmin(role)) {
        setUser(session.user);
        setWorkSession(session.workSession || null);
        navigate("admin-platform-companies");
        return;
      }

      if (isTenantOperator(role)) {
        setUser(session.user);
        setWorkSession(session.workSession || null);
        navigate("admin");
        return;
      }

      if (isStaffRole(role)) {
        setUser(session.user);
        setWorkSession(session.workSession || null);
        navigate("employee");
        return;
      }

      await logoutUser().catch(() => null);
      setUser(null);
      setWorkSession(null);
      setAdminLoginMessage(t("adminLogin.staffOnly"));
    } catch (error) {
      setAdminLoginMessage(error.message || t("auth.loginFailed"));
    }
  }

  async function handleRegister(profile) {
    try {
      const result = await registerCustomer(profile);
      setUser(result.user);
      setRegisterMessage(t("auth.registrationSuccessful"));
      navigate("account");
    } catch (error) {
      setRegisterMessage(error.message || t("auth.emailExists"));
    }
  }

  async function handleLogout() {
    try {
      const result = await logoutUser();
      setWorkSession(result?.workSession || null);
    } catch (error) {
      setCurrentUser(null);
    }
    setUser(null);
    setEmployeeSessions([]);
    navigate("home");
  }

  async function handleAdminLogout() {
    try {
      await logoutUser();
    } catch (error) {
      setCurrentUser(null);
    }
    setUser(null);
    setWorkSession(null);
    setEmployeeSessions([]);
    navigate("admin-login");
  }

  async function handleSaveProduct(product) {
    try {
      const exists = demoProducts.some((item) => item.id === product.id);
      const savedProduct = exists
        ? await updateProductApi(product)
        : await createProductApi(product);

      setDemoProducts((currentProducts) => {
        const stillExists = currentProducts.some(
          (item) => item.id === savedProduct.id
        );

        return stillExists
          ? currentProducts.map((item) =>
              item.id === savedProduct.id ? savedProduct : item
            )
          : [savedProduct, ...currentProducts];
      });
      setAdminMessage(t("admin.productSaved"));
      await refreshProducts();
      return { ok: true, message: t("admin.productSaved"), product: savedProduct };
    } catch (error) {
      setAdminMessage(error.message);
      return { ok: false, message: error.message };
    }
  }

  async function handleDeleteProduct(productId) {
    if (!window.confirm(t("admin.deleteConfirm"))) {
      return;
    }

    try {
      await deleteProductApi(productId);
      setDemoProducts((currentProducts) =>
        currentProducts.filter((product) => product.id !== productId)
      );
      setAdminMessage(t("admin.productDeleted"));
      await refreshProducts();
      return { ok: true, message: t("admin.productDeleted") };
    } catch (error) {
      setAdminMessage(error.message);
      return { ok: false, message: error.message };
    }
  }

  async function handleSaveEmployee(employee) {
    try {
      const exists = employees.some((item) => item.id === employee.id);
      const savedEmployee = exists
        ? await updateEmployeeApi(employee)
        : await createEmployeeApi(employee);

      setEmployees((currentEmployees) => {
        const stillExists = currentEmployees.some(
          (item) => item.id === savedEmployee.id
        );

        return stillExists
          ? currentEmployees.map((item) =>
              item.id === savedEmployee.id ? savedEmployee : item
            )
          : [savedEmployee, ...currentEmployees];
      });
      await refreshEmployees();
      const message = exists
        ? t("admin.employeeSaved")
        : t("employee.employeeCreatedSuccessfully");
      setAdminMessage(message);
      return { ok: true, message, employee: savedEmployee };
    } catch (error) {
      setAdminMessage(error.message);
      return { ok: false, message: error.message };
    }
  }

  async function handleDeleteEmployee(employeeId) {
    if (!window.confirm(t("admin.deleteEmployeeConfirm"))) {
      return;
    }

    try {
      await deleteEmployeeApi(employeeId);
      setEmployees((currentEmployees) =>
        currentEmployees.filter((employee) => employee.id !== employeeId)
      );
      setAdminMessage(t("admin.employeeDeleted"));
      await refreshEmployees();
      return { ok: true, message: t("admin.employeeDeleted") };
    } catch (error) {
      setAdminMessage(error.message);
      return { ok: false, message: error.message };
    }
  }

  async function handleToggleEmployeeStatus(employee) {
    try {
      const updatedEmployee = await updateEmployeeStatus(
        employee.id,
        !employee.isActive
      );
      setEmployees((currentEmployees) =>
        currentEmployees.map((item) =>
          item.id === updatedEmployee.id ? updatedEmployee : item
        )
      );
      setAdminMessage(t("admin.employeeUpdated"));
      await refreshEmployees();
      return { ok: true, message: t("admin.employeeUpdated") };
    } catch (error) {
      setAdminMessage(error.message);
      return { ok: false, message: error.message };
    }
  }

  async function handleOrderStatusChange(orderId, status) {
    try {
      const updatedOrder = await updateOrderStatus(orderId, status);
      setOrders((currentOrders) =>
        currentOrders.map((order) =>
          order.id === orderId ? updatedOrder : order
        )
      );
      setAdminMessage(t("admin.orderUpdated"));
      await refreshOrders();
      return { ok: true, message: t("employee.statusUpdatedSuccessfully"), order: updatedOrder };
    } catch (error) {
      setAdminMessage(error.message);
      return { ok: false, message: error.message };
    }
  }

  async function handleAssignEmployee(orderId, employeeId) {
    if (!employeeId) {
      return;
    }

    try {
      const updatedOrder = await assignOrderEmployee(orderId, employeeId);
      setOrders((currentOrders) =>
        currentOrders.map((order) =>
          order.id === orderId ? updatedOrder : order
        )
      );
      setAdminMessage(t("admin.orderUpdated"));
      await refreshOrders();
      return { ok: true, message: t("admin.orderUpdated"), order: updatedOrder };
    } catch (error) {
      setAdminMessage(error.message);
      return { ok: false, message: error.message };
    }
  }

  async function handleDeleteOrder(orderId) {
    if (!window.confirm(t("admin.deleteConfirm"))) {
      return { ok: false, message: "" };
    }

    try {
      await deleteOrder(orderId);
      await refreshOrders();
      const message = t("employee.orderDeletedSuccessfully");
      setAdminMessage(message);
      return { ok: true, message };
    } catch (error) {
      setAdminMessage(error.message);
      return { ok: false, message: error.message };
    }
  }

  async function handleSaveOffer(offer) {
    const savedOffer = await saveHomepageOffer(offer);
    const nextOffers = await fetchAllHomepageOffers();
    setHomepageOffers(nextOffers);
    return savedOffer;
  }

  async function handleSaveCategoryCard(card) {
    const savedCard = await saveHomepageCategoryCard(card);
    const nextCards = await fetchAllHomepageCategoryCards();
    setHomepageCategoryCards(nextCards);
    return savedCard;
  }

  async function handleDeleteOffer(offerId) {
    await deleteHomepageOffer(offerId);
    setHomepageOffers(await fetchAllHomepageOffers());
  }

  async function handleSubmitReview(review) {
    const savedReview = await submitCustomerReview(review);
    try {
      setReviews(await fetchHomepageStoreReviews());
    } catch (error) {
      setReviews([]);
    }
    return savedReview;
  }

  async function handleModerateReview(reviewId, status, isActive = true) {
    const updatedReview = await updateReviewStatus(reviewId, status, isActive);
    setReviews(await fetchAllReviews());
    return updatedReview;
  }

  async function handleDeleteReview(reviewId) {
    await deleteReviewApi(reviewId);
    setReviews(await fetchAllReviews());
  }

  async function handleSaveWebsiteMedia(item) {
    const saved = await saveWebsiteMediaApi(item);
    setWebsiteMedia((currentItems) => {
      const index = currentItems.findIndex(
        (entry) => entry.id === saved.id || entry.sectionKey === saved.sectionKey,
      );
      if (index === -1) {
        return [saved, ...currentItems];
      }
      return currentItems.map((entry, entryIndex) => (entryIndex === index ? saved : entry));
    });
    await loadWebsiteMedia(currentUser);
    setAdminMessage(t("admin.productSaved"));
    return saved;
  }

  async function handleDeleteWebsiteMedia(id) {
    await deleteWebsiteMediaApi(id);
    setWebsiteMedia((currentItems) => currentItems.filter((entry) => entry.id !== id));
    await loadWebsiteMedia(currentUser);
    setAdminMessage(t("admin.productDeleted"));
  }

  async function handleCreateOrder(customerInfo, options = {}) {
    try {
      const order = await createOrder({
              cartItems,
              customer: customerInfo,
              total: cartTotal,
              couponCode: options.couponCode,
              delivery_zone_id: options.delivery_zone_id,
              delivery_city_key: options.delivery_city_key,
              analyticsSessionKey: getStorefrontSessionKey(),
              attribution: getStorefrontAttribution(),
            });

      setOrders((currentOrders) => [order, ...currentOrders]);
      setLastOrder(order);
      setCheckoutMessage(t("checkout.orderPlacedSuccessfully"));
      setCartItems([]);
      const refreshedUser = await fetchCurrentUser();
      setUser(refreshedUser);
      return order;
    } catch (error) {
      setCheckoutMessage("");
      throw error;
    }
  }

  async function handleCreateEmployeeOrder(orderPayload) {
    const isPortalOperator = isTenantOperator(currentUser?.role) || isStaffRole(currentUser?.role);
    try {
      const order = await createOrder({
        ...orderPayload,
        createdByEmployeeId: isPortalOperator ? currentUser.id : "",
        createdByEmployeeName: isPortalOperator ? currentUser.name : "",
      });
      setOrders((currentOrders) => [order, ...currentOrders]);
      await refreshOrders();
      return { ok: true, message: t("employee.orderCreatedSuccessfully"), order };
    } catch (error) {
      return { ok: false, message: error.message };
    }
  }

  const isPortalLoginPage = activePage === "admin-login";
  const isAdminPanelPage = adminPageKeys.includes(activePage);
  const isAdminShellPage = isPortalLoginPage || isAdminPanelPage;

  return (
    <div className={isPortalLoginPage ? "app-shell admin-login-shell" : "app-shell"}>
      {!isAdminShellPage && !isStorefrontDisplayExcluded(storefrontContent.displayRules, window.location.pathname) && (
        <AnnouncementBar items={storefrontContent.announcements} onNavigate={navigate} />
      )}
      {!isAdminShellPage && !isStorefrontDisplayExcluded(storefrontContent.displayRules, window.location.pathname) && (
        <SplashAdGallery ads={storefrontContent.splashAds} page={window.location.pathname} />
      )}
      {!isAdminShellPage && (
        <Header
        activePage={activePage}
        cartCount={cartCount}
        language={language}
        products={demoProducts}
        websiteMedia={websiteMedia}
        onLanguageChange={() =>
          setLanguage((currentLanguage) =>
            currentLanguage === "en" ? "ar" : "en"
          )
        }
        onCategorySelect={handleCategorySelect}
        onNavigate={navigate}
        currentUser={currentUser}
        workSession={workSession}
        onLogout={handleLogout}
        t={t}
        />
      )}

      <main className={isPortalLoginPage ? "admin-login-main" : isAdminPanelPage ? "admin-panel-main" : undefined}>
        {activePage === "velvet-store" && (
          <MerchantStorefrontPage language={language} slug={window.location.pathname.split("/")[2]} />
        )}
        {activePage === "home" && (
          <HomePage
            homepageCategoryCards={homepageCategoryCards}
            homepageOffers={homepageOffers}
            homepageOffersStatus={homepageOffersStatus}
            language={language}
            onAddToCart={handleAddToCart}
            onCategorySelect={handleCategorySelect}
            onNavigate={navigate}
            onRetryOffers={loadHomeContent}
            onViewProduct={handleViewProduct}
            products={demoProducts}
            reviews={reviews}
            t={t}
            websiteMedia={websiteMedia}
          />
        )}

        {activePage === "products" && (
          <ProductsPage
            activeCategory={activeCategory}
            language={language}
            onAddToCart={handleAddToCart}
            onCategoryChange={setActiveCategory}
            onViewProduct={handleViewProduct}
            products={demoProducts}
            t={t}
            websiteMedia={websiteMedia}
          />
        )}

        {activePage === "bundles" && (
          <BundlesPage
            language={language}
            onViewBundle={handleViewBundle}
            t={t}
          />
        )}

        {activePage === "bundle-detail" && (
          <BundleDetailsPage
            bundleSlug={activeBundleSlug}
            language={language}
            onAddBundle={handleAddBundle}
            onNavigate={navigate}
            t={t}
          />
        )}

        {activePage === "product" && (
          <ProductDetailsPage
            language={language}
            onAddToCart={handleAddToCart}
            onNavigate={navigate}
            onViewProduct={handleViewProduct}
            product={activeDemoProduct}
            products={demoProducts}
            t={t}
          />
        )}

        {activePage === "cart" && (
          <CartPage
            cartItems={cartItems}
            currentUser={currentUser}
            language={language}
            onAddToCart={handleAddToCart}
            onNavigate={navigate}
            onRemoveItem={handleRemoveItem}
            onUpdateQuantity={handleUpdateQuantity}
            onViewProduct={handleViewProduct}
            products={demoProducts}
            t={t}
            total={cartTotal}
            websiteMedia={websiteMedia}
          />
        )}

        {activePage === "checkout" && (
          <CheckoutPage
            cartItems={cartItems}
            checkoutMessage={checkoutMessage}
            currentUser={currentUser}
            lastOrder={lastOrder}
            language={language}
            onCreateOrder={handleCreateOrder}
            onNavigate={navigate}
            products={demoProducts}
            t={t}
            total={cartTotal}
          />
        )}

        {activePage === "about" && (
          <AboutPage language={language} onNavigate={navigate} t={t} websiteMedia={websiteMedia} />
        )}

        {activePage === "sustainability" && (
          <SustainabilityPage language={language} onNavigate={navigate} t={t} websiteMedia={websiteMedia} products={demoProducts} onViewProduct={handleViewProduct} />
        )}

        {activePage === "how" && (
          <HowItWorksPage
            language={language}
            onNavigate={navigate}
            onViewProduct={handleViewProduct}
            products={demoProducts}
            websiteMedia={websiteMedia}
          />
        )}

        {activePage === "cleanups" && (
          <CleanupsPage language={language} onNavigate={navigate} websiteMedia={websiteMedia} />
        )}

        {activePage === "eb-points" && (
          <EBPointsPage
            currentUser={currentUser}
            language={language}
            onNavigate={navigate}
            websiteMedia={websiteMedia}
          />
        )}

        {(activePage === "social" || activePage === "follow-us") && <FollowUsPage />}
        {activePage === "policy" && (
          <StorePolicyPage
            policy={storefrontContent.policies.find((item) => item.id === activePolicyId)}
            language={language}
            onNavigate={navigate}
            t={t}
          />
        )}
        {activePage === "legal-information" && (
          <BusinessLegalInformationPage
            information={storefrontContent.legalInformation}
            language={language}
            onNavigate={navigate}
            t={t}
          />
        )}

        {activePage === "login" && (
          <LoginPage
            loginMessage={loginMessage}
            onLogin={handleLogin}
            onNavigate={navigate}
            t={t}
          />
        )}

        {activePage === "admin-login" && (
          <AdminLoginPage
            message={adminLoginMessage}
            onLogin={handleAdminLogin}
            onNavigate={navigate}
            t={t}
          />
        )}

        {activePage === "register" && (
          <RegisterPage
            message={registerMessage}
            onNavigate={navigate}
            onRegister={handleRegister}
            t={t}
          />
        )}

        {activePage === "account" && (
          <AccountPage
            currentUser={currentUser}
            language={language}
            onLogout={handleLogout}
            onNavigate={navigate}
            onSubmitReview={handleSubmitReview}
            orders={orders}
            products={demoProducts}
            t={t}
          />
        )}

        {activePage === "employee" && (
          <EmployeeDashboardPage
            currentUser={currentUser}
            language={language}
            onCreateOrder={handleCreateEmployeeOrder}
            onDeleteOrder={handleDeleteOrder}
            onDeleteProduct={handleDeleteProduct}
            onSaveCategoryCard={handleSaveCategoryCard}
            onNavigate={navigate}
            onSaveProduct={handleSaveProduct}
            onSaveOffer={handleSaveOffer}
            onDeleteOffer={handleDeleteOffer}
            onModerateReview={handleModerateReview}
            onDeleteReview={handleDeleteReview}
            onStatusChange={handleOrderStatusChange}
            orders={orders}
            products={demoProducts}
            t={t}
            workSession={workSession}
            websiteMedia={websiteMedia}
            onSaveWebsiteMedia={handleSaveWebsiteMedia}
            onDeleteWebsiteMedia={handleDeleteWebsiteMedia}
          />
        )}

        {adminPageKeys.includes(activePage) && !["admin-platform-companies", "admin-staff", "admin-staff-new", "admin-employees"].includes(activePage) && (
          <AdminDashboardPage
            activePage={activePage}
            currentUser={currentUser}
            employees={employees}
            language={language}
            onDeleteEmployee={handleDeleteEmployee}
            onDeleteProduct={handleDeleteProduct}
            onAssignEmployee={handleAssignEmployee}
            onDeleteOrder={handleDeleteOrder}
            onLogout={handleAdminLogout}
            onNavigate={navigate}
            onSaveOffer={handleSaveOffer}
            onDeleteOffer={handleDeleteOffer}
            onModerateReview={handleModerateReview}
            onDeleteReview={handleDeleteReview}
            onSaveEmployee={handleSaveEmployee}
            onSaveProduct={handleSaveProduct}
            onStatusChange={handleOrderStatusChange}
            orders={orders}
            products={demoProducts}
            homepageOffers={homepageOffers}
            homepageCategoryCards={homepageCategoryCards}
            isDarkMode={isAdminDarkMode}
            reviews={reviews}
            onLanguageChange={() =>
              setLanguage((currentLanguage) =>
                currentLanguage === "en" ? "ar" : "en"
              )
            }
            onToggleDarkMode={() => setIsAdminDarkMode((current) => !current)}
            onSaveCategoryCard={handleSaveCategoryCard}
            statusMessage={adminMessage}
            t={t}
            websiteMedia={websiteMedia}
            onSaveWebsiteMedia={handleSaveWebsiteMedia}
            onDeleteWebsiteMedia={handleDeleteWebsiteMedia}
          />
        )}

        {activePage === "admin-platform-companies" && (
          <AdminCompaniesPage
            currentUser={currentUser}
            isDarkMode={isAdminDarkMode}
            language={language}
            onLanguageChange={() =>
              setLanguage((currentLanguage) =>
                currentLanguage === "en" ? "ar" : "en"
              )
            }
            onLogout={handleAdminLogout}
            onNavigate={navigate}
            onToggleDarkMode={() => setIsAdminDarkMode((current) => !current)}
          />
        )}

        {["admin-staff", "admin-staff-new", "admin-employees"].includes(activePage) && (
          <AdminEmployeesPage
            activePage={activePage}
            currentUser={currentUser}
            employees={employees}
            language={language}
            isDarkMode={isAdminDarkMode}
            onLanguageChange={() =>
              setLanguage((currentLanguage) =>
                currentLanguage === "en" ? "ar" : "en"
              )
            }
            onDeleteEmployee={handleDeleteEmployee}
            onLogout={handleAdminLogout}
            onNavigate={navigate}
            onSaveEmployee={handleSaveEmployee}
            onToggleDarkMode={() => setIsAdminDarkMode((current) => !current)}
            onToggleEmployeeStatus={handleToggleEmployeeStatus}
            sessions={employeeSessions}
            statusMessage={adminMessage}
            t={t}
          />
        )}
      </main>

      {!isAdminShellPage && (
        <Footer
          onNavigate={navigate}
          policies={storefrontContent.policies}
          legalInformation={storefrontContent.legalInformation}
          t={t}
        />
      )}
    </div>
  );
}

export default App;
