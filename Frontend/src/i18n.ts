// Bilingual dictionary with ultra-crisp 3-4 word instructions
export type Language = 'bn' | 'en';

export const translations = {
  bn: {
    appTitle: 'রসুইঘর',
    appSubtitle: 'ব্যাচেলর মিল ট্র্যাকার',
    
    // Auth
    signIn: 'সাইন ইন',
    signUp: 'রেজিস্ট্রেশন',
    name: 'পূর্ণ নাম',
    email: 'ইমেইল এড্রেস',
    phone: 'মোবাইল নম্বর',
    password: 'পাসওয়ার্ড',
    confirmPassword: 'পাসওয়ার্ড নিশ্চিত করুন',
    passwordMismatch: 'পাসওয়ার্ড দুটি মিলছে না!',
    alreadyHaveAccount: 'আগের একাউন্ট আছে?',
    dontHaveAccount: 'নতুন মেস মেম্বার?',
    signInAction: 'লগইন করুন',
    signUpAction: 'অ্যাকাউন্ট খুলুন',
    accountCreatedSuccess: 'অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে! অনুগ্রহ করে সাইন ইন করুন।',
    authTagline: 'সহজ মেস মিল ব্যবস্থাপনা',

    // Instructions (3-4 words only!)
    instCreateHome: 'নতুন ঘর তৈরি করুন',
    instShareLink: 'আমন্ত্রণ লিংক শেয়ার করুন',
    instJoinHome: 'ঘরে যুক্ত হোন',
    instCreateMess: 'মেস সাইকেল চালু করুন',
    instTenDayDefault: 'ডিফল্ট ১০ দিনের মেস',
    instUpdateMeal: 'দৈনিক মিল আপডেট করুন',
    instAddBazaar: 'বাজার খরচ যুক্ত করুন',
    instAddDeposit: 'জমা টাকা রেকর্ড করুন',
    instViewSummary: 'চূড়ান্ত হিসাব দেখুন',

    // Navigation & Tabs
    tabMeals: 'মিল শিট',
    tabBazaar: 'বাজার',
    tabDeposits: 'জমা',
    tabSummary: 'হিসাব-নিকাশ',
    tabMembers: 'সদস্যবৃন্দ',

    // Home
    currentHome: 'বর্তমান ঘর',
    createHomeBtn: '+ নতুন ঘর',
    joinHomeBtn: 'লিংক দিয়ে যোগ',
    inviteLink: 'ইনভাইট লিংক',
    copyLink: 'লিংক কপি করুন',
    linkCopied: 'লিংক কপি হয়েছে!',
    membersCount: 'জন সদস্য',
    telegramStyleInvite: 'টেলিগ্রাম স্টাইল লিংক',
    homeNamePlaceholder: 'যেমন: Bachelor Point',
    homeAddressPlaceholder: 'যেমন: Road 7, Dhanmondi, Dhaka',

    // Mess Cycle
    activeMess: 'চলতি মেস',
    startNewMess: 'নতুন মেস শুরু',
    cycleDuration: 'মেস মেয়াদ (দিন)',
    tenDays: '১০ দিন (ডিফল্ট)',
    startDate: 'শুরুর তারিখ',
    endDate: 'শেষের তারিখ',
    cycleName: 'মেসের নাম',
    allCanCreate: 'যেকেউ তৈরি করতে পারে',
    days: 'দিন',
    defaultTag: '(ডিফল্ট)',

    // Meal Tracking & Slots
    breakfast: 'সকাল',
    lunch: 'দুপুর',
    dinner: 'রাত',
    guest: 'মেহমান',
    totalMeals: 'মোট মিল',
    todayQuickAction: 'আজকের মিল দ্রুত বদলান',
    on: 'চালু',
    off: 'বন্ধ',
    saveMeals: 'মিল সংরক্ষণ করুন',

    // Meal Dishes (Staple, Main Dish, Side Dish)
    mealMenu: 'প্রতি বেলার মেনু ও পদ',
    staple: 'প্রধান খাদ্য',
    mainDish: 'প্রধান পদ',
    sideDish: 'পার্শ্ব পদ',
    setMenu: 'মেনু ঠিক করুন',
    editMenu: 'মেনু পরিবর্তন',
    saveMenu: 'মেনু সেভ করুন',
    noMenuYet: 'মেনু এখনো যোগ করা হয়নি',
    breakfastSlot: 'সকালের নাস্তা',
    lunchSlot: 'দুপুরের খাবার',
    dinnerSlot: 'রাতের খাবার',
    staplePlaceholder: 'যেমন: ভাত / রুটি / পরোটা / খিচুড়ি',
    mainDishPlaceholder: 'যেমন: মুরগি / রুই মাছ / ডিম ভুনা / মাংস',
    sideDishPlaceholder: 'যেমন: ডাল / আলুভর্তা / শাক ভাজি / সবজি',

    // Bazaar
    addBazaarTitle: 'বাজার এন্ট্রি',
    buyer: 'বাজারকারী',
    amount: 'টাকা (৳)',
    items: 'বাজারের আইটেমসমূহ',
    date: 'তারিখ',
    noBazaarYet: 'কোন বাজার নেই',
    totalBazaarLabel: 'মোট বাজার',

    // Deposit
    addDepositTitle: 'টাকা জমা',
    member: 'মেম্বার',
    noDepositsYet: 'কোন জমা নেই',
    totalDepositLabel: 'মোট জমা',

    // Summary & Calculations
    mealRate: 'মিল রেট',
    totalBazaarCost: 'মোট বাজার খরচ',
    totalCashDeposit: 'মোট জমা টাকা',
    netBalance: 'অবশিষ্ট হিসাব',
    refundDue: 'ফেরত পাবে (+)',
    paymentDue: 'বকেয়া আছে (-)',
    perMealFormula: 'বাজার খরচ ÷ মোট মিল',
    costFormula: 'খরচ (মিল × রেট)',
    depositGiven: 'জমা দেওয়া টাকা',

    // Common Actions & Roles
    cancel: 'বাতিল',
    createAction: 'তৈরি করুন',
    joinAction: 'যুক্ত হোন',
    closeAction: 'বন্ধ করুন',
    startAction: 'শুরু করুন',
    saveAction: 'সংরক্ষণ করুন',
    managerRole: 'ম্যানেজার',
    memberRole: 'সদস্য',
    amountPlaceholder: 'টাকার পরিমাণ (৳)',
    inviteCodePrompt: 'ইনভাইট কোড লিখুন (যেমন: HOME-XXXXXX)',
    optional: 'ঐচ্ছিক',

    // Settings
    themeLight: 'লাইট মোড',
    themeDark: 'ডার্ক মোড',
    language: 'ভাষা',
    logout: 'লগআউট'
  },
  en: {
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
    passwordMismatch: 'Passwords do not match!',
    alreadyHaveAccount: 'Already have account?',
    dontHaveAccount: 'New bachelor member?',
    signInAction: 'Sign In Now',
    signUpAction: 'Create Account',
    accountCreatedSuccess: 'Account Created Successfully! Please sign in.',
    authTagline: 'Smart mess meal tracker',

    // Instructions (3-4 words only!)
    instCreateHome: 'Create new home',
    instShareLink: 'Share invite link',
    instJoinHome: 'Join the home',
    instCreateMess: 'Start mess cycle',
    instTenDayDefault: 'Default 10-day cycle',
    instUpdateMeal: 'Update daily meals',
    instAddBazaar: 'Log bazaar costs',
    instAddDeposit: 'Record cash deposit',
    instViewSummary: 'View meal calculations',

    // Navigation & Tabs
    tabMeals: 'Meal Sheet',
    tabBazaar: 'Bazaar',
    tabDeposits: 'Deposits',
    tabSummary: 'Summary',
    tabMembers: 'Members',

    // Home
    currentHome: 'Current Home',
    createHomeBtn: '+ New Home',
    joinHomeBtn: 'Join With Link',
    inviteLink: 'Invite Link',
    copyLink: 'Copy Link',
    linkCopied: 'Link copied!',
    membersCount: 'members',
    telegramStyleInvite: 'Telegram style invite',
    homeNamePlaceholder: 'e.g. Bachelor Nest',
    homeAddressPlaceholder: 'e.g. Dhanmondi Road 7',

    // Mess Cycle
    activeMess: 'Active Mess',
    startNewMess: 'Start New Mess',
    cycleDuration: 'Duration (Days)',
    tenDays: '10 Days (Default)',
    startDate: 'Start Date',
    endDate: 'End Date',
    cycleName: 'Cycle Name',
    allCanCreate: 'Anyone can create',
    days: 'days',
    defaultTag: '(Default)',

    // Meal Tracking & Slots
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner',
    guest: 'Guest',
    totalMeals: 'Total Meals',
    todayQuickAction: 'Quick meal toggle today',
    on: 'ON',
    off: 'OFF',
    saveMeals: 'Save meals',

    // Meal Dishes (Staple, Main Dish, Side Dish)
    mealMenu: 'Daily Meal Menu & Dishes',
    staple: 'Staple',
    mainDish: 'Main Dish',
    sideDish: 'Side Dish',
    setMenu: 'Plan Menu',
    editMenu: 'Edit Menu',
    saveMenu: 'Save Menu',
    noMenuYet: 'No dishes planned yet',
    breakfastSlot: 'Breakfast Slot',
    lunchSlot: 'Lunch Slot',
    dinnerSlot: 'Dinner Slot',
    staplePlaceholder: 'e.g. Rice / Roti / Paratha / Khichuri',
    mainDishPlaceholder: 'e.g. Chicken / Rui Fish / Beef / Egg Curry',
    sideDishPlaceholder: 'e.g. Daal / Mashed Potato / Veggies',

    // Bazaar
    addBazaarTitle: 'Bazaar Entry',
    buyer: 'Shopper',
    amount: 'Amount (৳)',
    items: 'Bazaar items list',
    date: 'Date',
    noBazaarYet: 'No expenses yet',
    totalBazaarLabel: 'Total Bazaar',

    // Deposit
    addDepositTitle: 'Cash Deposit',
    member: 'Member',
    noDepositsYet: 'No deposits yet',
    totalDepositLabel: 'Total Deposits',

    // Summary & Calculations
    mealRate: 'Meal Rate',
    totalBazaarCost: 'Total Bazaar Cost',
    totalCashDeposit: 'Total Cash Deposit',
    netBalance: 'Net Balance',
    refundDue: 'Refund due (+)',
    paymentDue: 'Payment due (-)',
    perMealFormula: 'Bazaar ÷ Total meals',
    costFormula: 'Cost (Meals × Rate)',
    depositGiven: 'Cash Deposited',

    // Common Actions & Roles
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
    optional: 'Optional',

    // Settings
    themeLight: 'Light Mode',
    themeDark: 'Dark Mode',
    language: 'Language',
    logout: 'Log Out'
  }
};
