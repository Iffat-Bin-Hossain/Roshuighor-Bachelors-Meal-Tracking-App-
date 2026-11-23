// Bilingual dictionary (বাংলা / English). `en` is typed against `bn`, so a missing key fails the build.
export type Language = 'bn' | 'en';

const bn = {
  appTitle: 'রসুইঘর',
  appSubtitle: 'ব্যাচেলর মিল ট্র্যাকার',

  // Auth
  signIn: 'সাইন ইন',
  signUp: 'রেজিস্ট্রেশন',
  name: 'পূর্ণ নাম',
  email: 'ইমেইল ঠিকানা',
  phone: 'মোবাইল নম্বর',
  password: 'পাসওয়ার্ড',
  confirmPassword: 'পাসওয়ার্ড নিশ্চিত করুন',
  passwordMismatch: 'পাসওয়ার্ড দুটি মিলছে না',
  alreadyHaveAccount: 'আগে থেকেই অ্যাকাউন্ট আছে? সাইন ইন করুন',
  dontHaveAccount: 'অ্যাকাউন্ট নেই? রেজিস্ট্রেশন করুন',
  signInAction: 'সাইন ইন করুন',
  signUpAction: 'অ্যাকাউন্ট খুলুন',
  authTagline: 'সহজ মেস মিল ব্যবস্থাপনা',
  namePlaceholder: 'যেমন: ইফফাত বিন হোসেন',
  emailPlaceholder: 'যেমন: name@gmail.com',
  phonePlaceholder: 'যেমন: 01712-345678',
  passwordPlaceholder: 'আপনার পাসওয়ার্ড লিখুন',
  newPasswordPlaceholder: 'কমপক্ষে ৮ অক্ষর, অক্ষর ও সংখ্যা মিলিয়ে',
  confirmPasswordPlaceholder: 'পাসওয়ার্ডটি আবার লিখুন',
  passwordHint: 'কমপক্ষে ৮ অক্ষর এবং অন্তত একটি অক্ষর ও একটি সংখ্যা থাকতে হবে',
  showPassword: 'পাসওয়ার্ড দেখান',
  hidePassword: 'পাসওয়ার্ড লুকান',
  nameRequired: 'আপনার নাম লিখুন',
  nameTooShort: 'নাম কমপক্ষে ২ অক্ষরের হতে হবে',
  nameInvalidChars: 'নামে শুধু বাংলা বা ইংরেজি অক্ষর ব্যবহার করুন',

  // Email verification & password reset
  forgotPassword: 'পাসওয়ার্ড ভুলে গেছেন?',
  forgotTitle: 'পাসওয়ার্ড রিসেট',
  forgotSubtitle: 'আপনার অ্যাকাউন্টের ইমেইল দিন — আমরা একটি ৬ সংখ্যার রিসেট কোড পাঠাব।',
  sendCode: 'কোড পাঠান',
  verifyTitle: 'ইমেইল যাচাই করুন',
  verifySubtitle: 'আমরা একটি ৬ সংখ্যার কোড পাঠিয়েছি:',
  codeLabel: '৬ সংখ্যার কোড',
  verifyAction: 'যাচাই করুন',
  resendCode: 'নতুন কোড পাঠান',
  resendIn: '{s} সেকেন্ড পর আবার পাঠাতে পারবেন',
  codeResent: 'নতুন কোড পাঠানো হয়েছে। ইনবক্স (এবং স্প্যাম ফোল্ডার) দেখুন।',
  checkSpam: 'ইমেইল না পেলে স্প্যাম/প্রমোশন ফোল্ডার দেখুন।',
  resetTitle: 'নতুন পাসওয়ার্ড দিন',
  resetSubtitle: 'ইমেইলে পাঠানো কোড এবং নতুন পাসওয়ার্ড লিখুন:',
  newPassword: 'নতুন পাসওয়ার্ড',
  resetAction: 'পাসওয়ার্ড পরিবর্তন করুন',
  backToSignIn: '← সাইন ইনে ফিরে যান',
  changeEmail: 'ভিন্ন ইমেইল ব্যবহার করুন',
  resetCodeSent: 'অ্যাকাউন্ট থাকলে রিসেট কোড ইমেইলে পাঠানো হয়েছে।',
  verifyNeeded: 'সাইন ইনের আগে ইমেইল যাচাই করুন। কোড পাঠানো হয়েছে।',
  sessionExpired: 'সেশনের মেয়াদ শেষ। আবার সাইন ইন করুন।',

  // Instructions
  instCreateHome: 'নতুন ঘর তৈরি করুন',
  instShareLink: 'আমন্ত্রণ লিংক শেয়ার করুন',
  instJoinHome: 'ঘরে যুক্ত হোন',
  instCreateMess: 'মেস সাইকেল চালু করুন',
  instTenDayDefault: 'ডিফল্ট ১০ দিনের মেস',
  instUpdateMeal: 'দৈনিক মিল আপডেট করুন',
  instAddBazaar: 'বাজার খরচ যুক্ত করুন',
  instAddDeposit: 'জমা টাকা রেকর্ড করুন',
  instViewSummary: 'চূড়ান্ত হিসাব দেখুন',

  // Navigation & Tabs
  tabMeals: 'মিল শিট',
  tabBazaar: 'বাজার',
  tabDeposits: 'জমা',
  tabSummary: 'হিসাব-নিকাশ',
  tabMembers: 'সদস্যবৃন্দ',

  // Home
  currentHome: 'বর্তমান ঘর',
  createHomeBtn: '+ নতুন ঘর',
  joinHomeBtn: 'লিংক দিয়ে যোগ দিন',
  inviteLink: 'আমন্ত্রণ লিংক',
  copyLink: 'লিংক কপি করুন',
  linkCopied: 'লিংক কপি হয়েছে!',
  membersCount: 'জন সদস্য',
  memberSingular: 'জন সদস্য',
  telegramStyleInvite: 'এই লিংকে ক্লিক করেই সদস্যরা ঘরে যোগ দিতে পারবে',
  homeInvite: 'ঘরে যোগদানের আমন্ত্রণ',
  invitedBy: 'আমন্ত্রণকারী',
  signUpToJoin: 'যোগ দিতে অ্যাকাউন্ট খুলুন',
  signInToJoin: 'আগে থেকেই অ্যাকাউন্ট আছে? সাইন ইন করুন',
  homeNamePlaceholder: 'যেমন: ব্যাচেলর পয়েন্ট',
  homeAddressPlaceholder: 'যেমন: রোড ৭, ধানমন্ডি, ঢাকা',

  // Mess Cycle
  activeMess: 'চলতি মেস',
  startNewMess: 'নতুন মেস শুরু',
  cycleDuration: 'মেসের মেয়াদ',
  tenDays: '১০ দিন (ডিফল্ট)',
  startDate: 'শুরুর তারিখ',
  endDate: 'শেষের তারিখ',
  cycleName: 'মেসের নাম',
  cycleNamePlaceholder: 'যেমন: নভেম্বর ১-১০ মেস (ঐচ্ছিক)',
  allCanCreate: 'যেকোনো সদস্য তৈরি করতে পারেন',
  days: 'দিন',
  defaultTag: '(ডিফল্ট)',

  // Meal Tracking & Slots
  breakfast: 'সকাল',
  lunch: 'দুপুর',
  dinner: 'রাত',
  lunchShort: 'দু',
  dinnerShort: 'রা',
  guest: 'অতিথি',
  totalMeals: 'মোট মিল',
  todayQuickAction: 'ট্যাপ করে নিজের মিল চালু/বন্ধ করুন',
  on: 'চালু',
  off: 'বন্ধ',
  saveMeals: 'মিল সংরক্ষণ করুন',
  dateOutsideMess: 'এই তারিখটি চলতি মেসের মেয়াদের বাইরে',

  // Meal Dishes
  mealMenu: 'বেলাভিত্তিক মেনু',
  staple: 'ভাত/রুটি',
  mainDish: 'প্রধান পদ',
  sideDish: 'পার্শ্ব পদ',
  setMenu: 'মেনু ঠিক করুন',
  editMenu: 'মেনু পরিবর্তন',
  saveMenu: 'মেনু সেভ করুন',
  noMenuYet: 'মেনু এখনো যোগ করা হয়নি',
  breakfastSlot: 'সকালের নাস্তা',
  lunchSlot: 'দুপুরের খাবার',
  dinnerSlot: 'রাতের খাবার',
  staplePlaceholder: 'যেমন: ভাত / রুটি / খিচুড়ি',
  mainDishPlaceholder: 'যেমন: মুরগি / রুই মাছ / ডিম ভুনা',
  sideDishPlaceholder: 'যেমন: ডাল / আলুভর্তা / শাক ভাজি',

  // Bazaar
  addBazaarTitle: 'বাজার যোগ করুন',
  buyer: 'বাজারকারী',
  amount: 'টাকা (৳)',
  items: 'বাজারের তালিকা',
  itemsPlaceholder: 'যেমন: চাল, ডাল, তেল, মাছ',
  date: 'তারিখ',
  noBazaarYet: 'এখনো কোনো বাজার যোগ হয়নি',
  totalBazaarLabel: 'মোট বাজার',

  // Deposit
  addDepositTitle: 'জমা যোগ করুন',
  member: 'সদস্য',
  noDepositsYet: 'এখনো কোনো জমা নেই',
  totalDepositLabel: 'মোট জমা',

  // Summary
  mealRate: 'মিল রেট',
  totalBazaarCost: 'মোট বাজার খরচ',
  totalCashDeposit: 'মোট জমা টাকা',
  netBalance: 'অবশিষ্ট হিসাব',
  refundDue: 'ফেরত পাবেন (+)',
  paymentDue: 'বকেয়া আছে (−)',
  perMealFormula: 'বাজার খরচ ÷ মোট মিল',
  costFormula: 'খরচ (মিল × রেট)',
  depositGiven: 'জমা দেওয়া টাকা',
  noSummaryYet: 'হিসাব দেখাতে বাজার বা মিল যোগ করুন',

  // Common
  cancel: 'বাতিল',
  createAction: 'তৈরি করুন',
  joinAction: 'যোগ দিন',
  closeAction: 'বন্ধ করুন',
  startAction: 'শুরু করুন',
  saveAction: 'সংরক্ষণ করুন',
  managerRole: 'ম্যানেজার',
  memberRole: 'সদস্য',
  amountPlaceholder: 'টাকার পরিমাণ (৳)',
  inviteCodePrompt: 'ইনভাইট কোড লিখুন (যেমন: HOME-XXXXXX)',
  inviteCodePlaceholder: 'HOME-XXXXXX',
  optional: 'ঐচ্ছিক',
  pleaseWait: 'অপেক্ষা করুন...',

  // Settings
  themeLight: 'লাইট মোড',
  themeDark: 'ডার্ক মোড',
  toggleTheme: 'থিম পরিবর্তন',
  language: 'ভাষা',
  changeLanguage: 'ভাষা পরিবর্তন',
  logout: 'লগআউট',

  // PWA
  installApp: 'অ্যাপ ইনস্টল করুন',
  offlineNotice: 'আপনি অফলাইনে আছেন — ইন্টারনেট সংযোগ ফিরলে ডেটা আপডেট হবে',
  updateAvailable: 'নতুন সংস্করণ এসেছে',
  reload: 'রিলোড',

  // Server error codes → messages
  errors: {
    INVALID_EMAIL: 'সঠিক ইমেইল ঠিকানা দিন (যেমন: name@gmail.com)',
    EMAIL_UNDELIVERABLE: 'এই ইমেইল ঠিকানায় মেইল পাঠানো সম্ভব নয়। বানান পরীক্ষা করুন।',
    DISPOSABLE_EMAIL: 'অস্থায়ী (temporary) ইমেইল ব্যবহার করা যাবে না',
    WEAK_PASSWORD: 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে এবং অক্ষর ও সংখ্যা দুটোই থাকতে হবে',
    INVALID_NAME: 'সঠিক নাম লিখুন (শুধু বাংলা বা ইংরেজি অক্ষর)',
    INVALID_PHONE: 'সঠিক মোবাইল নম্বর দিন',
    EMAIL_TAKEN: 'এই ইমেইল দিয়ে আগেই অ্যাকাউন্ট খোলা হয়েছে। সাইন ইন করুন।',
    INVALID_CREDENTIALS: 'ইমেইল বা পাসওয়ার্ড সঠিক নয়',
    MISSING_FIELDS: 'ইমেইল ও পাসওয়ার্ড দিন',
    EMAIL_NOT_VERIFIED: 'সাইন ইনের আগে ইমেইল যাচাই করুন',
    INVALID_CODE: 'কোডটি সঠিক নয়',
    CODE_EXPIRED: 'কোডের মেয়াদ শেষ। নতুন কোড নিন।',
    TOO_MANY_ATTEMPTS: 'অনেকবার ভুল কোড দেওয়া হয়েছে। নতুন কোড নিন।',
    RESEND_COOLDOWN: 'নতুন কোড পাঠাতে একটু অপেক্ষা করুন',
    EMAIL_SEND_FAILED: 'ইমেইল পাঠানো যায়নি। কিছুক্ষণ পর আবার চেষ্টা করুন।',
    ALREADY_VERIFIED: 'ইমেইল আগেই যাচাই করা হয়েছে। সাইন ইন করুন।',
    RATE_LIMITED: 'অনেকবার চেষ্টা করা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।',
    SESSION_EXPIRED: 'সেশনের মেয়াদ শেষ। আবার সাইন ইন করুন।',
    AUTH_REQUIRED: 'অনুগ্রহ করে সাইন ইন করুন',
    NETWORK_ERROR: 'সার্ভারের সাথে সংযোগ করা যাচ্ছে না। ইন্টারনেট সংযোগ দেখুন।',
    SERVER_ERROR: 'সার্ভারে সমস্যা হয়েছে। আবার চেষ্টা করুন।',
    MESS_NOT_FOUND: 'মেসটি পাওয়া যায়নি',
    NOT_HOME_MEMBER: 'এই সদস্য এই ঘরের অংশ নন',
    INVITE_NOT_FOUND: 'ইনভাইট কোডটি সঠিক নয়',
    DATE_OUTSIDE_MESS: 'এই তারিখটি চলতি মেসের মেয়াদের বাইরে',
    INVALID_AMOUNT: 'টাকার পরিমাণ ০ এর বেশি হতে হবে',
    INVALID_DURATION: 'মেসের মেয়াদ ১ থেকে ৬০ দিনের মধ্যে হতে হবে',
    INVALID_DATE: 'সঠিক তারিখ দিন',
    NOT_FOUND: 'তথ্যটি পাওয়া যায়নি',
    BAD_REQUEST: 'তথ্য সঠিক নয়। আবার পরীক্ষা করুন।',
    DEFAULT: 'কিছু একটা সমস্যা হয়েছে। আবার চেষ্টা করুন।'
  } as Record<string, string>
};

export type Dict = typeof bn;

const en: Dict = {
  appTitle: 'রসুইঘর',
  appSubtitle: 'Bachelor Meal Tracker',

  // Auth
  signIn: 'Sign In',
  signUp: 'Sign Up',
  name: 'Full Name',
  email: 'Email Address',
  phone: 'Phone Number',
  password: 'Password',
  confirmPassword: 'Confirm Password',
  passwordMismatch: 'Passwords do not match',
  alreadyHaveAccount: 'Already have an account? Sign in',
  dontHaveAccount: "Don't have an account? Sign up",
  signInAction: 'Sign In',
  signUpAction: 'Create Account',
  authTagline: 'Smart mess meal tracker',
  namePlaceholder: 'e.g. Iffat Bin Hossain',
  emailPlaceholder: 'e.g. name@gmail.com',
  phonePlaceholder: 'e.g. 01712-345678',
  passwordPlaceholder: 'Enter your password',
  newPasswordPlaceholder: 'At least 8 characters, letters & numbers',
  confirmPasswordPlaceholder: 'Re-enter your password',
  passwordHint: 'At least 8 characters, including a letter and a number',
  showPassword: 'Show password',
  hidePassword: 'Hide password',
  nameRequired: 'Please enter your name',
  nameTooShort: 'Name must be at least 2 characters',
  nameInvalidChars: 'Use only English or Bangla letters in your name',

  // Email verification & password reset
  forgotPassword: 'Forgot password?',
  forgotTitle: 'Reset Password',
  forgotSubtitle: "Enter your account email — we'll send you a 6-digit reset code.",
  sendCode: 'Send Code',
  verifyTitle: 'Verify Your Email',
  verifySubtitle: 'We sent a 6-digit code to:',
  codeLabel: '6-digit code',
  verifyAction: 'Verify',
  resendCode: 'Resend code',
  resendIn: 'You can resend in {s}s',
  codeResent: 'A new code has been sent. Check your inbox (and spam folder).',
  checkSpam: "Didn't get it? Check your Spam/Promotions folder.",
  resetTitle: 'Set a New Password',
  resetSubtitle: 'Enter the code from your email and your new password:',
  newPassword: 'New Password',
  resetAction: 'Update Password',
  backToSignIn: '← Back to sign in',
  changeEmail: 'Use a different email',
  resetCodeSent: 'If an account exists, a reset code has been emailed.',
  verifyNeeded: 'Please verify your email before signing in. A code has been sent.',
  sessionExpired: 'Your session has expired. Please sign in again.',

  // Instructions
  instCreateHome: 'Create a new home',
  instShareLink: 'Share invite link',
  instJoinHome: 'Join the home',
  instCreateMess: 'Start a mess cycle',
  instTenDayDefault: 'Default 10-day cycle',
  instUpdateMeal: 'Update daily meals',
  instAddBazaar: 'Log bazaar costs',
  instAddDeposit: 'Record cash deposit',
  instViewSummary: 'Final settlement',

  // Navigation & Tabs
  tabMeals: 'Meal Sheet',
  tabBazaar: 'Bazaar',
  tabDeposits: 'Deposits',
  tabSummary: 'Summary',
  tabMembers: 'Members',

  // Home
  currentHome: 'Current Home',
  createHomeBtn: '+ New Home',
  joinHomeBtn: 'Join with Link',
  inviteLink: 'Invite Link',
  copyLink: 'Copy Link',
  linkCopied: 'Link copied!',
  membersCount: 'members',
  memberSingular: 'member',
  telegramStyleInvite: 'Anyone with this link can join your home in one tap',
  homeInvite: 'Home Invitation',
  invitedBy: 'Invited by',
  signUpToJoin: 'Create account to join',
  signInToJoin: 'Already have an account? Sign in',
  homeNamePlaceholder: 'e.g. Bachelor Point',
  homeAddressPlaceholder: 'e.g. Road 7, Dhanmondi, Dhaka',

  // Mess Cycle
  activeMess: 'Active Mess',
  startNewMess: 'Start New Mess',
  cycleDuration: 'Duration',
  tenDays: '10 Days (Default)',
  startDate: 'Start Date',
  endDate: 'End Date',
  cycleName: 'Cycle Name',
  cycleNamePlaceholder: 'e.g. November 1-10 Mess (optional)',
  allCanCreate: 'Any member can create',
  days: 'days',
  defaultTag: '(Default)',

  // Meal Tracking & Slots
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  lunchShort: 'L',
  dinnerShort: 'D',
  guest: 'Guest',
  totalMeals: 'Total Meals',
  todayQuickAction: 'Tap to turn your meals on/off',
  on: 'ON',
  off: 'OFF',
  saveMeals: 'Save meals',
  dateOutsideMess: 'This date is outside the current mess cycle',

  // Meal Dishes
  mealMenu: 'Meal Menu',
  staple: 'Staple',
  mainDish: 'Main Dish',
  sideDish: 'Side Dish',
  setMenu: 'Plan Menu',
  editMenu: 'Edit Menu',
  saveMenu: 'Save Menu',
  noMenuYet: 'No dishes planned yet',
  breakfastSlot: 'Breakfast',
  lunchSlot: 'Lunch',
  dinnerSlot: 'Dinner',
  staplePlaceholder: 'e.g. Rice / Roti / Khichuri',
  mainDishPlaceholder: 'e.g. Chicken / Rui Fish / Egg Curry',
  sideDishPlaceholder: 'e.g. Daal / Mashed Potato / Greens',

  // Bazaar
  addBazaarTitle: 'Add Bazaar',
  buyer: 'Shopper',
  amount: 'Amount (৳)',
  items: 'Items bought',
  itemsPlaceholder: 'e.g. Rice, Lentils, Oil, Fish',
  date: 'Date',
  noBazaarYet: 'No bazaar entries yet',
  totalBazaarLabel: 'Total Bazaar',

  // Deposit
  addDepositTitle: 'Add Deposit',
  member: 'Member',
  noDepositsYet: 'No deposits yet',
  totalDepositLabel: 'Total Deposits',

  // Summary
  mealRate: 'Meal Rate',
  totalBazaarCost: 'Total Bazaar Cost',
  totalCashDeposit: 'Total Cash Deposit',
  netBalance: 'Net Balance',
  refundDue: 'Gets back (+)',
  paymentDue: 'Owes (−)',
  perMealFormula: 'Bazaar cost ÷ Total meals',
  costFormula: 'Cost (Meals × Rate)',
  depositGiven: 'Cash Deposited',
  noSummaryYet: 'Add meals or bazaar to see the summary',

  // Common
  cancel: 'Cancel',
  createAction: 'Create',
  joinAction: 'Join',
  closeAction: 'Close',
  startAction: 'Start',
  saveAction: 'Save',
  managerRole: 'Manager',
  memberRole: 'Member',
  amountPlaceholder: 'Amount in BDT (৳)',
  inviteCodePrompt: 'Enter invite code (e.g. HOME-XXXXXX)',
  inviteCodePlaceholder: 'HOME-XXXXXX',
  optional: 'Optional',
  pleaseWait: 'Please wait...',

  // Settings
  themeLight: 'Light Mode',
  themeDark: 'Dark Mode',
  toggleTheme: 'Toggle theme',
  language: 'Language',
  changeLanguage: 'Change language',
  logout: 'Log Out',

  // PWA
  installApp: 'Install App',
  offlineNotice: "You're offline — data will refresh when you reconnect",
  updateAvailable: 'A new version is available',
  reload: 'Reload',

  errors: {
    INVALID_EMAIL: 'Please enter a valid email address (e.g. name@gmail.com)',
    EMAIL_UNDELIVERABLE: "This email address can't receive mail. Please check the spelling.",
    DISPOSABLE_EMAIL: 'Temporary email addresses are not allowed',
    WEAK_PASSWORD: 'Password must be at least 8 characters and include letters and numbers',
    INVALID_NAME: 'Please enter a valid name (English or Bangla letters only)',
    INVALID_PHONE: 'Please enter a valid phone number',
    EMAIL_TAKEN: 'An account with this email already exists. Please sign in.',
    INVALID_CREDENTIALS: 'Incorrect email or password',
    MISSING_FIELDS: 'Please enter your email and password',
    EMAIL_NOT_VERIFIED: 'Please verify your email before signing in',
    INVALID_CODE: 'That code is incorrect',
    CODE_EXPIRED: 'This code has expired. Please request a new one.',
    TOO_MANY_ATTEMPTS: 'Too many wrong attempts. Please request a new code.',
    RESEND_COOLDOWN: 'Please wait a moment before requesting another code',
    EMAIL_SEND_FAILED: "We couldn't send the email. Please try again shortly.",
    ALREADY_VERIFIED: 'Email already verified. Please sign in.',
    RATE_LIMITED: 'Too many attempts. Please try again later.',
    SESSION_EXPIRED: 'Your session has expired. Please sign in again.',
    AUTH_REQUIRED: 'Please sign in',
    NETWORK_ERROR: "Can't reach the server. Check your internet connection.",
    SERVER_ERROR: 'Something went wrong on the server. Please try again.',
    MESS_NOT_FOUND: 'Mess not found',
    NOT_HOME_MEMBER: 'This person is not a member of this home',
    INVITE_NOT_FOUND: 'Invalid invite code',
    DATE_OUTSIDE_MESS: 'This date is outside the current mess cycle',
    INVALID_AMOUNT: 'Amount must be greater than 0',
    INVALID_DURATION: 'Duration must be between 1 and 60 days',
    INVALID_DATE: 'Please enter a valid date',
    NOT_FOUND: 'Not found',
    BAD_REQUEST: 'Some information is invalid. Please check and try again.',
    DEFAULT: 'Something went wrong. Please try again.'
  }
};

export const translations: Record<Language, Dict> = { bn, en };

/** Translated message for an error thrown by apiFetch (uses the server's `code`). */
export const errorMessage = (t: Dict, err: unknown): string => {
  const code = (err as { code?: string })?.code;
  return (code && t.errors[code]) || t.errors.DEFAULT;
};

const locale = (lang: Language) => (lang === 'bn' ? 'bn-BD' : 'en-US');

/** Number with locale digits — Bangla numerals (১২৩) in bn. */
export const formatNum = (n: number | string, lang: Language, maxFractionDigits = 2): string => {
  const v = typeof n === 'string' ? parseFloat(n) : n;
  if (!Number.isFinite(v)) return '—';
  return new Intl.NumberFormat(locale(lang), { maximumFractionDigits: maxFractionDigits }).format(v);
};

// In Bangla a non-breaking space keeps "৳" from visually merging with Bangla digits (৳০ reads like ৬০)
export const formatMoney = (n: number | string, lang: Language): string =>
  lang === 'bn' ? `৳\u00A0${formatNum(n, lang)}` : `৳${formatNum(n, lang)}`;

/** 'YYYY-MM-DD' → '২৩ নভে' / 'Nov 23' (timezone-safe: parsed and printed in UTC). */
export const formatDate = (iso: string, lang: Language, withYear = false): string => {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(locale(lang), {
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
    timeZone: 'UTC'
  });
};

export const membersLabel = (count: number, t: Dict, lang: Language): string =>
  `${formatNum(count, lang, 0)} ${count === 1 ? t.memberSingular : t.membersCount}`;

/** Today's date in the user's local timezone as YYYY-MM-DD (toISOString() would give the UTC date). */
export const todayLocal = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
