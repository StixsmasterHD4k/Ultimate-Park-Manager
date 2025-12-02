/**
 * Ultimate Park Manager - Enhanced OpenRCT2 Plugin
 * Version: 2.2.0
 * 
 * A comprehensive park management plugin that combines:
 * - Automatic ride price management based on ride value, age, and excitement
 * - Park admission fee management with guest feedback analysis
 * - Shop price optimization with weather-based pricing
 * - Soft guest cap calculations
 * - Multiple pricing algorithms (OpenRCT2, Classic, Good Value)
 * 
 * Based on algorithms from:
 * - Original Ride Price Manager by mgovea, Sadret, kscheel
 * - rct2calc.shottysteve.com by shottysteve/Deurklink
 * - rct-calculators by KaydeArcane
 * - MonkeybrainStudio OpenRCT Calculator
 * 
 * License: MIT
 */

(function() {
    'use strict';

    // ============================================================================
    // CONSTANTS AND CONFIGURATION
    // ============================================================================

    var PLUGIN_NAME = 'Ultimate Park Manager';
    var PLUGIN_VERSION = '2.2.0';
    var WINDOW_ID = 'ultimate_park_manager';
    var STORAGE_PREFIX = 'UltimateParkManager.';

    // Storage keys
    var KEYS = {
        pluginEnabled: STORAGE_PREFIX + 'pluginEnabled',
        rideManagementEnabled: STORAGE_PREFIX + 'rideManagementEnabled',
        goodValueEnabled: STORAGE_PREFIX + 'goodValueEnabled',
        ignoreFreeRides: STORAGE_PREFIX + 'ignoreFreeRides',
        lazyTaxFactor: STORAGE_PREFIX + 'lazyTaxFactor',
        unboundPrices: STORAGE_PREFIX + 'unboundPrices',
        parkFeeEnabled: STORAGE_PREFIX + 'parkFeeEnabled',
        maxParkFee: STORAGE_PREFIX + 'maxParkFee',
        parkFeeStrategy: STORAGE_PREFIX + 'parkFeeStrategy',
        shopOvercharge: STORAGE_PREFIX + 'shopOvercharge',
        shopPriceEnabled: STORAGE_PREFIX + 'shopPriceEnabled',
        weatherPricing: STORAGE_PREFIX + 'weatherPricing',
        updateInterval: STORAGE_PREFIX + 'updateInterval',
        autoAdjustFromFeedback: STORAGE_PREFIX + 'autoAdjustFromFeedback',
        currentTab: STORAGE_PREFIX + 'currentTab'
    };

    // Default values
    var DEFAULTS = {
        pluginEnabled: true,
        rideManagementEnabled: true,
        goodValueEnabled: false,
        ignoreFreeRides: true,
        lazyTaxFactor: 0,
        unboundPrices: false,
        parkFeeEnabled: false,
        maxParkFee: 100,
        parkFeeStrategy: 0,
        shopOvercharge: 0,
        shopPriceEnabled: false,
        weatherPricing: true,
        updateInterval: 0,
        autoAdjustFromFeedback: true,
        currentTab: 0
    };

    // Lazy tax options
    var LAZY_TAX_OPTIONS = ['0%', '5%', '10%', '15%', '20%', '30%', '40%', '50%'];
    var LAZY_TAX_VALUES = [0, 0.05, 0.10, 0.15, 0.20, 0.30, 0.40, 0.50];

    // Shop overcharge options
    var SHOP_OVERCHARGE_OPTIONS = ['None', '+10%', '+20%', '+30%', '+50%', '+100%'];
    var SHOP_OVERCHARGE_VALUES = [0, 0.10, 0.20, 0.30, 0.50, 1.00];

    // Park fee strategies
    var PARK_FEE_STRATEGIES = ['Conservative', 'Balanced', 'Aggressive', 'Maximum'];

    // Update intervals
    var UPDATE_INTERVALS = ['Daily', 'Weekly', 'Monthly'];

    // Age multipliers for ride value calculation
    var AGE_VALUES = [
        { maxAge: 5, multiplier: 1.0 },
        { maxAge: 13, multiplier: 1.0 },
        { maxAge: 40, multiplier: 1.0 },
        { maxAge: 88, multiplier: 0.875 },
        { maxAge: 104, multiplier: 0.75 },
        { maxAge: 120, multiplier: 0.625 },
        { maxAge: 128, multiplier: 0.5 },
        { maxAge: 200, multiplier: 0.375 },
        { maxAge: 65535, multiplier: 0.25 }
    ];

    // Shop item base prices
    var SHOP_ITEMS = {
        balloon: { name: 'Balloon', baseValue: 14, hotValue: 14, coldValue: 14 },
        toy: { name: 'Toy', baseValue: 30, hotValue: 30, coldValue: 30 },
        map: { name: 'Map', baseValue: 7, hotValue: 7, coldValue: 7 },
        photo: { name: 'On-Ride Photo', baseValue: 30, hotValue: 30, coldValue: 30 },
        umbrella: { name: 'Umbrella', baseValue: 35, hotValue: 20, coldValue: 35 },
        drink: { name: 'Drink', baseValue: 12, hotValue: 20, coldValue: 8 },
        burger: { name: 'Burger', baseValue: 19, hotValue: 19, coldValue: 19 },
        chips: { name: 'Chips', baseValue: 16, hotValue: 16, coldValue: 16 },
        ice_cream: { name: 'Ice Cream', baseValue: 10, hotValue: 18, coldValue: 6 },
        candyfloss: { name: 'Candy Floss', baseValue: 11, hotValue: 11, coldValue: 11 },
        pizza: { name: 'Pizza', baseValue: 21, hotValue: 21, coldValue: 21 },
        popcorn: { name: 'Popcorn', baseValue: 13, hotValue: 13, coldValue: 13 },
        hot_dog: { name: 'Hot Dog', baseValue: 17, hotValue: 17, coldValue: 17 },
        tentacle: { name: 'Tentacle', baseValue: 17, hotValue: 17, coldValue: 17 },
        hat: { name: 'Hat', baseValue: 16, hotValue: 30, coldValue: 10 },
        toffee_apple: { name: 'Toffee Apple', baseValue: 10, hotValue: 10, coldValue: 10 },
        tshirt: { name: 'T-Shirt', baseValue: 32, hotValue: 32, coldValue: 32 },
        doughnut: { name: 'Doughnut', baseValue: 11, hotValue: 11, coldValue: 11 },
        coffee: { name: 'Coffee', baseValue: 12, hotValue: 8, coldValue: 20 },
        chicken: { name: 'Fried Chicken', baseValue: 19, hotValue: 19, coldValue: 19 },
        lemonade: { name: 'Lemonade', baseValue: 12, hotValue: 21, coldValue: 7 },
        hot_chocolate: { name: 'Hot Chocolate', baseValue: 12, hotValue: 8, coldValue: 20 },
        iced_tea: { name: 'Iced Tea', baseValue: 10, hotValue: 18, coldValue: 6 },
        funnel_cake: { name: 'Funnel Cake', baseValue: 13, hotValue: 13, coldValue: 13 },
        sunglasses: { name: 'Sunglasses', baseValue: 15, hotValue: 28, coldValue: 8 },
        beef_noodles: { name: 'Beef Noodles', baseValue: 15, hotValue: 15, coldValue: 15 },
        wonton_soup: { name: 'Wonton Soup', baseValue: 13, hotValue: 9, coldValue: 19 },
        meatball_soup: { name: 'Meatball Soup', baseValue: 13, hotValue: 9, coldValue: 19 },
        fruit_juice: { name: 'Fruit Juice', baseValue: 13, hotValue: 21, coldValue: 8 },
        soybean_milk: { name: 'Soybean Milk', baseValue: 11, hotValue: 7, coldValue: 18 },
        sujeonggwa: { name: 'Sujeonggwa', baseValue: 13, hotValue: 18, coldValue: 10 },
        sub_sandwich: { name: 'Sub Sandwich', baseValue: 20, hotValue: 20, coldValue: 20 },
        cookie: { name: 'Cookie', baseValue: 8, hotValue: 8, coldValue: 8 },
        roast_sausage: { name: 'Roast Sausage', baseValue: 16, hotValue: 16, coldValue: 16 }
    };

    // ============================================================================
    // STORAGE HELPERS
    // ============================================================================

    function getSetting(key, defaultValue) {
        var value = context.sharedStorage.get(key);
        return value !== undefined ? value : defaultValue;
    }

    function setSetting(key, value) {
        context.sharedStorage.set(key, value);
    }

    function getSettings() {
        return {
            pluginEnabled: getSetting(KEYS.pluginEnabled, DEFAULTS.pluginEnabled),
            rideManagementEnabled: getSetting(KEYS.rideManagementEnabled, DEFAULTS.rideManagementEnabled),
            goodValueEnabled: getSetting(KEYS.goodValueEnabled, DEFAULTS.goodValueEnabled),
            ignoreFreeRides: getSetting(KEYS.ignoreFreeRides, DEFAULTS.ignoreFreeRides),
            lazyTaxFactor: getSetting(KEYS.lazyTaxFactor, DEFAULTS.lazyTaxFactor),
            unboundPrices: getSetting(KEYS.unboundPrices, DEFAULTS.unboundPrices),
            parkFeeEnabled: getSetting(KEYS.parkFeeEnabled, DEFAULTS.parkFeeEnabled),
            maxParkFee: getSetting(KEYS.maxParkFee, DEFAULTS.maxParkFee),
            parkFeeStrategy: getSetting(KEYS.parkFeeStrategy, DEFAULTS.parkFeeStrategy),
            shopOvercharge: getSetting(KEYS.shopOvercharge, DEFAULTS.shopOvercharge),
            shopPriceEnabled: getSetting(KEYS.shopPriceEnabled, DEFAULTS.shopPriceEnabled),
            weatherPricing: getSetting(KEYS.weatherPricing, DEFAULTS.weatherPricing),
            updateInterval: getSetting(KEYS.updateInterval, DEFAULTS.updateInterval),
            autoAdjustFromFeedback: getSetting(KEYS.autoAdjustFromFeedback, DEFAULTS.autoAdjustFromFeedback),
            currentTab: getSetting(KEYS.currentTab, DEFAULTS.currentTab)
        };
    }

    // ============================================================================
    // PRICE CALCULATION ALGORITHMS
    // ============================================================================

    function getRideAge(ride) {
        return date.monthsElapsed - ride.buildDate;
    }

    function getAgeMultiplier(ageInMonths) {
        for (var i = 0; i < AGE_VALUES.length; i++) {
            if (ageInMonths < AGE_VALUES[i].maxAge) {
                return AGE_VALUES[i].multiplier;
            }
        }
        return AGE_VALUES[AGE_VALUES.length - 1].multiplier;
    }

    function isOpenAndRatedRide(ride) {
        return ride.classification === 'ride' && 
               ride.status === 'open' && 
               ride.excitement >= 0;
    }

    function hasDuplicateRideType(ride) {
        var rides = map.rides;
        var count = 0;
        for (var i = 0; i < rides.length; i++) {
            if (rides[i].type === ride.type && 
                rides[i].status === 'open' && 
                rides[i].excitement >= 0) {
                count++;
            }
            if (count > 1) return true;
        }
        return false;
    }

    function calculateRidePrice(ride, settings) {
        if (!isOpenAndRatedRide(ride)) {
            return null;
        }

        var excitement = ride.excitement;
        var intensity = ride.intensity;
        var nausea = ride.nausea;

        var rideObj = ride.object;
        var excitementMultiplier = rideObj ? rideObj.excitementMultiplier : 100;
        var intensityMultiplier = rideObj ? rideObj.intensityMultiplier : 100;
        var nauseaMultiplier = rideObj ? rideObj.nauseaMultiplier : 100;

        var eVal = Math.floor(excitement * excitementMultiplier / 1024);
        var iVal = Math.floor(intensity * intensityMultiplier / 1024);
        var nVal = Math.floor(nausea * nauseaMultiplier / 1024);
        
        var rideValue = eVal + iVal + nVal;

        var ageInMonths = getRideAge(ride);
        var ageMultiplier = getAgeMultiplier(ageInMonths);
        rideValue = Math.floor(rideValue * ageMultiplier);

        if (hasDuplicateRideType(ride)) {
            rideValue = Math.floor(rideValue * 0.75);
        }

        var hasParkEntryFee = park.entranceFee > 0;
        var calculatedPrice;

        if (hasParkEntryFee) {
            calculatedPrice = Math.floor(rideValue / 4);
        } else {
            calculatedPrice = rideValue;
        }

        if (settings.goodValueEnabled) {
            calculatedPrice = Math.floor(calculatedPrice / 2);
        } else {
            calculatedPrice = calculatedPrice * 2;
        }

        if (settings.lazyTaxFactor > 0) {
            calculatedPrice = Math.floor(calculatedPrice * (1 - settings.lazyTaxFactor));
        }

        if (!settings.unboundPrices) {
            calculatedPrice = Math.min(calculatedPrice, 200);
        }

        calculatedPrice = Math.max(0, calculatedPrice);

        return calculatedPrice;
    }

    function setRidePrice(ride, price) {
        context.executeAction('ridesetprice', {
            ride: ride.id,
            price: price,
            isPrimaryPrice: true
        }, function() {});
    }

    function updateRidePrices(forceUpdate) {
        var settings = getSettings();
        
        if (!settings.pluginEnabled || !settings.rideManagementEnabled) {
            return;
        }

        var rides = map.rides;
        for (var i = 0; i < rides.length; i++) {
            var ride = rides[i];
            
            if (!forceUpdate && ride.price[0] === 0 && settings.ignoreFreeRides) {
                continue;
            }

            var price = calculateRidePrice(ride, settings);
            if (price !== null) {
                setRidePrice(ride, price);
            }
        }
    }

    function makeAllRidesFree() {
        var rides = map.rides;
        for (var i = 0; i < rides.length; i++) {
            if (isOpenAndRatedRide(rides[i])) {
                setRidePrice(rides[i], 0);
            }
        }
    }

    // ============================================================================
    // PARK ADMISSION FEE MANAGEMENT
    // ============================================================================

    function analyzeGuestFeedback() {
        var guests = map.getAllEntities('guest');
        var tooCheap = 0;
        var tooExpensive = 0;
        var total = 0;

        for (var i = 0; i < guests.length; i++) {
            var guest = guests[i];
            if (guest.isInPark) {
                total++;
                var thoughts = guest.thoughts;
                for (var j = 0; j < thoughts.length; j++) {
                    var thought = thoughts[j];
                    if (thought.type === 'good_value') {
                        tooCheap++;
                    } else if (thought.type === 'bad_value' || thought.type === 'not_paying') {
                        tooExpensive++;
                    }
                }
            }
        }

        return {
            tooCheap: tooCheap,
            tooExpensive: tooExpensive,
            total: total,
            cheapRatio: total > 0 ? tooCheap / total : 0,
            expensiveRatio: total > 0 ? tooExpensive / total : 0
        };
    }

    function calculateParkAdmissionFee(settings) {
        var totalRideValue = 0;
        var rideCount = 0;
        var rides = map.rides;

        for (var i = 0; i < rides.length; i++) {
            var ride = rides[i];
            if (isOpenAndRatedRide(ride)) {
                totalRideValue += ride.value;
                rideCount++;
            }
        }

        if (rideCount === 0) {
            return 0;
        }

        var baseFee;
        var strategy = settings.parkFeeStrategy;

        switch (strategy) {
            case 0: baseFee = Math.floor(totalRideValue / 8); break;
            case 1: baseFee = Math.floor(totalRideValue / 6); break;
            case 2: baseFee = Math.floor(totalRideValue / 4); break;
            case 3: baseFee = Math.floor(totalRideValue / 3); break;
            default: baseFee = Math.floor(totalRideValue / 6);
        }

        var ratingMultiplier = Math.min(1.5, Math.max(0.5, park.rating / 700));
        baseFee = Math.floor(baseFee * ratingMultiplier);
        baseFee = Math.min(baseFee, settings.maxParkFee * 10);

        if (settings.autoAdjustFromFeedback) {
            var feedback = analyzeGuestFeedback();
            if (feedback.expensiveRatio > 0.15) {
                baseFee = Math.floor(baseFee * 0.9);
            } else if (feedback.cheapRatio > 0.25) {
                baseFee = Math.min(baseFee + 10, settings.maxParkFee * 10);
            }
        }

        return Math.max(0, baseFee);
    }

    function setParkAdmissionFee(fee) {
        context.executeAction('parksetentrancefee', {
            value: fee
        }, function() {});
    }

    function updateParkAdmissionFee() {
        var settings = getSettings();
        
        if (!settings.pluginEnabled || !settings.parkFeeEnabled) {
            return;
        }

        var fee = calculateParkAdmissionFee(settings);
        setParkAdmissionFee(fee);
    }

    // ============================================================================
    // SHOP PRICE MANAGEMENT
    // ============================================================================

    function getWeatherCondition() {
        var temp = climate.current.temperature;
        var weather = climate.current.weather;

        return {
            hot: temp > 20,
            cold: temp < 10,
            raining: weather >= 1 && weather <= 3
        };
    }

    function calculateShopItemPrice(itemData, settings) {
        var weather = getWeatherCondition();
        var price = itemData.baseValue;

        if (settings.weatherPricing) {
            if (weather.hot && itemData.hotValue !== undefined) {
                price = Math.max(price, itemData.hotValue);
            }
            if (weather.cold && itemData.coldValue !== undefined) {
                price = Math.max(price, itemData.coldValue);
            }
        }

        if (settings.shopOvercharge > 0) {
            price = Math.floor(price * (1 + settings.shopOvercharge));
        }

        return price;
    }

    function updateShopPrices() {
        var settings = getSettings();
        
        if (!settings.pluginEnabled || !settings.shopPriceEnabled) {
            return;
        }

        var rides = map.rides;
        for (var i = 0; i < rides.length; i++) {
            var ride = rides[i];
            if (ride.classification === 'stall' || ride.classification === 'facility') {
                var rideObj = ride.object;
                if (rideObj && rideObj.shopItem !== undefined && rideObj.shopItem >= 0) {
                    var itemKey = getShopItemKey(rideObj.shopItem);
                    if (itemKey && SHOP_ITEMS[itemKey]) {
                        var price = calculateShopItemPrice(SHOP_ITEMS[itemKey], settings);
                        context.executeAction('ridesetprice', {
                            ride: ride.id,
                            price: price,
                            isPrimaryPrice: true
                        }, function() {});
                    }
                }
            }
        }
    }

    function getShopItemKey(index) {
        var itemKeys = [
            'balloon', 'toy', 'map', 'photo', 'umbrella', 'drink', 'burger',
            'chips', 'ice_cream', 'candyfloss', 'pizza', 'popcorn', 'hot_dog',
            'tentacle', 'hat', 'toffee_apple', 'tshirt', 'doughnut', 'coffee',
            'chicken', 'lemonade', null, 'hot_chocolate', 'iced_tea',
            'funnel_cake', 'sunglasses', 'beef_noodles', null,
            'wonton_soup', 'meatball_soup', 'fruit_juice', 'soybean_milk',
            'sujeonggwa', 'sub_sandwich', 'cookie', 'roast_sausage'
        ];
        if (index >= 0 && index < itemKeys.length) {
            return itemKeys[index];
        }
        return null;
    }

    // ============================================================================
    // SOFT GUEST CAP CALCULATION
    // ============================================================================

    function calculateSoftGuestCap() {
        var totalCap = 0;
        var rides = map.rides;

        for (var i = 0; i < rides.length; i++) {
            var ride = rides[i];
            if (ride.status === 'open' && ride.excitement >= 0) {
                var contribution = Math.floor(ride.excitement / 100);
                contribution = Math.max(1, contribution);
                if (ride.classification === 'ride') {
                    contribution *= 2;
                }
                totalCap += contribution;
            }
        }

        var ratingBonus = Math.floor(park.rating / 100);
        totalCap += ratingBonus;

        return Math.max(50, totalCap * 4);
    }

    // ============================================================================
    // STATISTICS
    // ============================================================================

    function getParkStatistics() {
        var settings = getSettings();
        var rides = map.rides;
        var openRides = 0;
        var totalRideValue = 0;
        var totalRideRevenue = 0;
        var avgExcitement = 0;

        for (var i = 0; i < rides.length; i++) {
            var ride = rides[i];
            if (ride.classification === 'ride' && ride.status === 'open') {
                openRides++;
                totalRideValue += ride.value;
                totalRideRevenue += ride.totalProfit;
                avgExcitement += ride.excitement;
            }
        }

        if (openRides > 0) {
            avgExcitement = Math.floor(avgExcitement / openRides);
        }

        var guestFeedback = analyzeGuestFeedback();
        var softGuestCap = calculateSoftGuestCap();

        return {
            openRides: openRides,
            totalRideValue: totalRideValue,
            totalRideRevenue: totalRideRevenue,
            avgExcitement: avgExcitement,
            guestCount: guestFeedback.total,
            softGuestCap: softGuestCap,
            parkRating: park.rating,
            parkValue: park.value,
            currentAdmissionFee: park.entranceFee,
            recommendedAdmissionFee: calculateParkAdmissionFee(settings),
            tooCheapGuests: guestFeedback.tooCheap,
            tooExpensiveGuests: guestFeedback.tooExpensive
        };
    }

    // ============================================================================
    // USER INTERFACE - REBUILT WITH WINDOW RECREATION ON TAB SWITCH
    // ============================================================================

    var windowWidth = 400;
    var windowHeight = 380;

    function getWeatherName() {
        var names = ['Sunny', 'Light Rain', 'Heavy Rain', 'Storm', 'Snow'];
        var weather = climate.current.weather;
        return names[weather] || 'Unknown';
    }

    function findLazyTaxIndex(value) {
        for (var i = 0; i < LAZY_TAX_VALUES.length; i++) {
            if (Math.abs(LAZY_TAX_VALUES[i] - value) < 0.001) return i;
        }
        return 0;
    }

    function findOverchargeIndex(value) {
        for (var i = 0; i < SHOP_OVERCHARGE_VALUES.length; i++) {
            if (Math.abs(SHOP_OVERCHARGE_VALUES[i] - value) < 0.001) return i;
        }
        return 0;
    }

    function getWeatherTip() {
        var weather = getWeatherCondition();
        if (weather.hot) return 'Hot weather - boost cold drinks!';
        if (weather.cold) return 'Cold weather - boost hot drinks!';
        if (weather.raining) return 'Raining - umbrellas in demand!';
        return 'Mild weather - standard prices';
    }

    // Create base widgets (header + tabs) shared by all tabs
    function createBaseWidgets(currentTab, settings) {
        return [
            // Master enable checkbox
            {
                type: 'checkbox',
                name: 'chkPluginEnabled',
                x: 10,
                y: 20,
                width: windowWidth - 20,
                height: 14,
                text: 'Enable Ultimate Park Manager',
                isChecked: settings.pluginEnabled,
                onChange: function(isChecked) {
                    setSetting(KEYS.pluginEnabled, isChecked);
                }
            },
            // Tab buttons
            {
                type: 'button',
                name: 'btnTab0',
                x: 10,
                y: 42,
                width: 90,
                height: 14,
                text: 'Rides',
                isPressed: currentTab === 0,
                onClick: function() { openWindowWithTab(0); }
            },
            {
                type: 'button',
                name: 'btnTab1',
                x: 105,
                y: 42,
                width: 90,
                height: 14,
                text: 'Park Fee',
                isPressed: currentTab === 1,
                onClick: function() { openWindowWithTab(1); }
            },
            {
                type: 'button',
                name: 'btnTab2',
                x: 200,
                y: 42,
                width: 90,
                height: 14,
                text: 'Shops',
                isPressed: currentTab === 2,
                onClick: function() { openWindowWithTab(2); }
            },
            {
                type: 'button',
                name: 'btnTab3',
                x: 295,
                y: 42,
                width: 90,
                height: 14,
                text: 'Statistics',
                isPressed: currentTab === 3,
                onClick: function() { openWindowWithTab(3); }
            },
            // Content area groupbox
            {
                type: 'groupbox',
                x: 5,
                y: 58,
                width: windowWidth - 10,
                height: windowHeight - 68
            }
        ];
    }

    // TAB 0: Rides
    function createRidesTabWidgets(settings) {
        var y = 75;
        var spacing = 24;
        return [
            {
                type: 'checkbox',
                name: 'chkRideEnabled',
                x: 15,
                y: y,
                width: windowWidth - 30,
                height: 14,
                text: 'Enable automatic ride price management',
                isChecked: settings.rideManagementEnabled,
                onChange: function(isChecked) {
                    setSetting(KEYS.rideManagementEnabled, isChecked);
                }
            },
            {
                type: 'checkbox',
                name: 'chkIgnoreFree',
                x: 15,
                y: y + spacing,
                width: windowWidth - 30,
                height: 14,
                text: 'Ignore rides with free admission',
                isChecked: settings.ignoreFreeRides,
                onChange: function(isChecked) {
                    setSetting(KEYS.ignoreFreeRides, isChecked);
                }
            },
            {
                type: 'checkbox',
                name: 'chkGoodValue',
                x: 15,
                y: y + spacing * 2,
                width: windowWidth - 30,
                height: 14,
                text: 'Enable "Good Value" pricing (50% off)',
                isChecked: settings.goodValueEnabled,
                onChange: function(isChecked) {
                    setSetting(KEYS.goodValueEnabled, isChecked);
                }
            },
            {
                type: 'checkbox',
                name: 'chkUnbound',
                x: 15,
                y: y + spacing * 3,
                width: windowWidth - 30,
                height: 14,
                text: 'Allow prices above $20.00',
                isChecked: settings.unboundPrices,
                onChange: function(isChecked) {
                    setSetting(KEYS.unboundPrices, isChecked);
                }
            },
            {
                type: 'label',
                x: 15,
                y: y + spacing * 4 + 8,
                width: 170,
                height: 14,
                text: '"Lazy Tax" price reduction:'
            },
            {
                type: 'dropdown',
                name: 'ddLazyTax',
                x: 220,
                y: y + spacing * 4 + 5,
                width: 120,
                height: 14,
                items: LAZY_TAX_OPTIONS,
                selectedIndex: findLazyTaxIndex(settings.lazyTaxFactor),
                onChange: function(index) {
                    setSetting(KEYS.lazyTaxFactor, LAZY_TAX_VALUES[index]);
                }
            },
            {
                type: 'label',
                x: 15,
                y: y + spacing * 5 + 8,
                width: 170,
                height: 14,
                text: 'Update prices:'
            },
            {
                type: 'dropdown',
                name: 'ddInterval',
                x: 220,
                y: y + spacing * 5 + 5,
                width: 120,
                height: 14,
                items: UPDATE_INTERVALS,
                selectedIndex: settings.updateInterval,
                onChange: function(index) {
                    setSetting(KEYS.updateInterval, index);
                }
            },
            {
                type: 'button',
                name: 'btnForceUpdate',
                x: 15,
                y: y + spacing * 7,
                width: windowWidth - 30,
                height: 24,
                text: 'Force Update ALL Ride Prices Now',
                onClick: function() {
                    updateRidePrices(true);
                    ui.showError('Success', 'All ride prices updated!');
                }
            },
            {
                type: 'button',
                name: 'btnMakeFree',
                x: 15,
                y: y + spacing * 8 + 4,
                width: windowWidth - 30,
                height: 24,
                text: 'Make ALL Rides FREE',
                onClick: function() {
                    makeAllRidesFree();
                    ui.showError('Success', 'All rides are now free!');
                }
            }
        ];
    }

    // TAB 1: Park Fee
    function createParkFeeTabWidgets(settings) {
        var stats = getParkStatistics();
        var y = 75;
        var spacing = 24;
        return [
            {
                type: 'checkbox',
                name: 'chkParkFeeEnabled',
                x: 15,
                y: y,
                width: windowWidth - 30,
                height: 14,
                text: 'Enable automatic park admission fee',
                isChecked: settings.parkFeeEnabled,
                onChange: function(isChecked) {
                    setSetting(KEYS.parkFeeEnabled, isChecked);
                }
            },
            {
                type: 'checkbox',
                name: 'chkFeedback',
                x: 15,
                y: y + spacing,
                width: windowWidth - 30,
                height: 14,
                text: 'Auto-adjust based on guest feedback',
                isChecked: settings.autoAdjustFromFeedback,
                onChange: function(isChecked) {
                    setSetting(KEYS.autoAdjustFromFeedback, isChecked);
                }
            },
            {
                type: 'label',
                x: 15,
                y: y + spacing * 2 + 8,
                width: 140,
                height: 14,
                text: 'Pricing strategy:'
            },
            {
                type: 'dropdown',
                name: 'ddStrategy',
                x: 180,
                y: y + spacing * 2 + 5,
                width: 140,
                height: 14,
                items: PARK_FEE_STRATEGIES,
                selectedIndex: settings.parkFeeStrategy,
                onChange: function(index) {
                    setSetting(KEYS.parkFeeStrategy, index);
                }
            },
            {
                type: 'label',
                x: 15,
                y: y + spacing * 3 + 8,
                width: 140,
                height: 14,
                text: 'Max fee: $' + settings.maxParkFee.toFixed(2)
            },
            {
                type: 'spinner',
                name: 'spnMaxFee',
                x: 180,
                y: y + spacing * 3 + 5,
                width: 140,
                height: 14,
                text: '$' + settings.maxParkFee.toFixed(2),
                onIncrement: function() {
                    var newVal = Math.min(getSetting(KEYS.maxParkFee, 100) + 5, 200);
                    setSetting(KEYS.maxParkFee, newVal);
                    openWindowWithTab(1);
                },
                onDecrement: function() {
                    var newVal = Math.max(getSetting(KEYS.maxParkFee, 100) - 5, 0);
                    setSetting(KEYS.maxParkFee, newVal);
                    openWindowWithTab(1);
                }
            },
            {
                type: 'label',
                x: 15,
                y: y + spacing * 5,
                width: windowWidth - 30,
                height: 14,
                text: 'Current fee: $' + (stats.currentAdmissionFee / 10).toFixed(2)
            },
            {
                type: 'label',
                x: 15,
                y: y + spacing * 5 + 18,
                width: windowWidth - 30,
                height: 14,
                text: 'Recommended fee: $' + (stats.recommendedAdmissionFee / 10).toFixed(2)
            },
            {
                type: 'label',
                x: 15,
                y: y + spacing * 5 + 36,
                width: windowWidth - 30,
                height: 14,
                text: 'Guest feedback: ' + stats.tooCheapGuests + ' cheap, ' + stats.tooExpensiveGuests + ' expensive'
            },
            {
                type: 'button',
                name: 'btnApplyFee',
                x: 15,
                y: y + spacing * 8,
                width: windowWidth - 30,
                height: 24,
                text: 'Apply Recommended Fee Now',
                onClick: function() {
                    updateParkAdmissionFee();
                    openWindowWithTab(1);
                }
            },
            {
                type: 'button',
                name: 'btnFreePark',
                x: 15,
                y: y + spacing * 9 + 4,
                width: windowWidth - 30,
                height: 24,
                text: 'Make Park Entry FREE',
                onClick: function() {
                    setParkAdmissionFee(0);
                    openWindowWithTab(1);
                }
            }
        ];
    }

    // TAB 2: Shops
    function createShopsTabWidgets(settings) {
        var y = 75;
        var spacing = 24;
        return [
            {
                type: 'checkbox',
                name: 'chkShopEnabled',
                x: 15,
                y: y,
                width: windowWidth - 30,
                height: 14,
                text: 'Enable automatic shop pricing',
                isChecked: settings.shopPriceEnabled,
                onChange: function(isChecked) {
                    setSetting(KEYS.shopPriceEnabled, isChecked);
                }
            },
            {
                type: 'checkbox',
                name: 'chkWeather',
                x: 15,
                y: y + spacing,
                width: windowWidth - 30,
                height: 14,
                text: 'Adjust prices based on weather',
                isChecked: settings.weatherPricing,
                onChange: function(isChecked) {
                    setSetting(KEYS.weatherPricing, isChecked);
                }
            },
            {
                type: 'label',
                x: 15,
                y: y + spacing * 2 + 8,
                width: 140,
                height: 14,
                text: 'Overcharge markup:'
            },
            {
                type: 'dropdown',
                name: 'ddOvercharge',
                x: 180,
                y: y + spacing * 2 + 5,
                width: 140,
                height: 14,
                items: SHOP_OVERCHARGE_OPTIONS,
                selectedIndex: findOverchargeIndex(settings.shopOvercharge),
                onChange: function(index) {
                    setSetting(KEYS.shopOvercharge, SHOP_OVERCHARGE_VALUES[index]);
                }
            },
            {
                type: 'label',
                x: 15,
                y: y + spacing * 4,
                width: windowWidth - 30,
                height: 14,
                text: 'Current: ' + climate.current.temperature + 'C | ' + getWeatherName()
            },
            {
                type: 'label',
                x: 15,
                y: y + spacing * 4 + 18,
                width: windowWidth - 30,
                height: 14,
                text: getWeatherTip()
            },
            {
                type: 'button',
                name: 'btnUpdateShops',
                x: 15,
                y: y + spacing * 7,
                width: windowWidth - 30,
                height: 24,
                text: 'Update All Shop Prices Now',
                onClick: function() {
                    updateShopPrices();
                    ui.showError('Success', 'Shop prices updated!');
                }
            }
        ];
    }

    // TAB 3: Statistics
    function createStatisticsTabWidgets() {
        var stats = getParkStatistics();
        var y = 75;
        var lineHeight = 18;
        return [
            {
                type: 'label',
                x: 15,
                y: y,
                width: windowWidth - 30,
                height: 14,
                text: '=== Park Overview ==='
            },
            {
                type: 'label',
                x: 15,
                y: y + lineHeight,
                width: windowWidth - 30,
                height: 14,
                text: 'Park Rating: ' + stats.parkRating
            },
            {
                type: 'label',
                x: 15,
                y: y + lineHeight * 2,
                width: windowWidth - 30,
                height: 14,
                text: 'Park Value: $' + (stats.parkValue / 10).toFixed(2)
            },
            {
                type: 'label',
                x: 15,
                y: y + lineHeight * 3,
                width: windowWidth - 30,
                height: 14,
                text: 'Guests in Park: ' + stats.guestCount
            },
            {
                type: 'label',
                x: 15,
                y: y + lineHeight * 4,
                width: windowWidth - 30,
                height: 14,
                text: 'Soft Guest Cap: ~' + stats.softGuestCap
            },
            {
                type: 'label',
                x: 15,
                y: y + lineHeight * 5 + 8,
                width: windowWidth - 30,
                height: 14,
                text: '=== Ride Statistics ==='
            },
            {
                type: 'label',
                x: 15,
                y: y + lineHeight * 6 + 8,
                width: windowWidth - 30,
                height: 14,
                text: 'Open Rides: ' + stats.openRides
            },
            {
                type: 'label',
                x: 15,
                y: y + lineHeight * 7 + 8,
                width: windowWidth - 30,
                height: 14,
                text: 'Total Ride Value: ' + stats.totalRideValue
            },
            {
                type: 'label',
                x: 15,
                y: y + lineHeight * 8 + 8,
                width: windowWidth - 30,
                height: 14,
                text: 'Avg Excitement: ' + (stats.avgExcitement / 100).toFixed(2)
            },
            {
                type: 'label',
                x: 15,
                y: y + lineHeight * 9 + 16,
                width: windowWidth - 30,
                height: 14,
                text: '=== Revenue ==='
            },
            {
                type: 'label',
                x: 15,
                y: y + lineHeight * 10 + 16,
                width: windowWidth - 30,
                height: 14,
                text: 'Total Ride Profit: $' + (stats.totalRideRevenue / 10).toFixed(2)
            },
            {
                type: 'button',
                name: 'btnRefresh',
                x: 15,
                y: y + lineHeight * 12 + 20,
                width: windowWidth - 30,
                height: 24,
                text: 'Refresh Statistics',
                onClick: function() {
                    openWindowWithTab(3);
                }
            }
        ];
    }

    // Open window with specific tab (closes existing window first)
    function openWindowWithTab(tabIndex) {
        var existingWindow = ui.getWindow(WINDOW_ID);
        if (existingWindow) {
            existingWindow.close();
        }

        setSetting(KEYS.currentTab, tabIndex);
        var settings = getSettings();

        // Create base widgets
        var widgets = createBaseWidgets(tabIndex, settings);

        // Add tab-specific widgets
        var tabWidgets;
        switch (tabIndex) {
            case 0:
                tabWidgets = createRidesTabWidgets(settings);
                break;
            case 1:
                tabWidgets = createParkFeeTabWidgets(settings);
                break;
            case 2:
                tabWidgets = createShopsTabWidgets(settings);
                break;
            case 3:
                tabWidgets = createStatisticsTabWidgets();
                break;
            default:
                tabWidgets = createRidesTabWidgets(settings);
        }

        widgets = widgets.concat(tabWidgets);

        ui.openWindow({
            classification: WINDOW_ID,
            title: PLUGIN_NAME + ' v' + PLUGIN_VERSION,
            width: windowWidth,
            height: windowHeight,
            widgets: widgets
        });
    }

    function openWindow() {
        var existingWindow = ui.getWindow(WINDOW_ID);
        if (existingWindow) {
            existingWindow.bringToFront();
            return;
        }

        var currentTab = getSetting(KEYS.currentTab, 0);
        openWindowWithTab(currentTab);
    }

    // ============================================================================
    // MAIN UPDATE LOOP
    // ============================================================================

    var dayCounter = 0;

    function onDayUpdate() {
        var settings = getSettings();
        
        if (!settings.pluginEnabled) {
            return;
        }

        dayCounter++;

        var shouldUpdate = false;
        switch (settings.updateInterval) {
            case 0: shouldUpdate = true; break;
            case 1: shouldUpdate = (dayCounter % 7 === 0); break;
            case 2: shouldUpdate = (dayCounter % 31 === 0); break;
        }

        if (shouldUpdate) {
            if (settings.rideManagementEnabled) {
                updateRidePrices(false);
            }
            if (settings.parkFeeEnabled) {
                updateParkAdmissionFee();
            }
            if (settings.shopPriceEnabled) {
                updateShopPrices();
            }
        }
    }

    // ============================================================================
    // PLUGIN REGISTRATION
    // ============================================================================

    function main() {
        if (typeof ui !== 'undefined') {
            ui.registerMenuItem(PLUGIN_NAME, function() {
                openWindow();
            });
        }

        if (network.mode !== 'client') {
            context.subscribe('interval.day', onDayUpdate);

            var settings = getSettings();
            if (settings.pluginEnabled && settings.rideManagementEnabled) {
                updateRidePrices(false);
            }
        }

        console.log(PLUGIN_NAME + ' v' + PLUGIN_VERSION + ' loaded successfully!');
    }

    registerPlugin({
        name: PLUGIN_NAME,
        version: PLUGIN_VERSION,
        authors: ['Enhanced Plugin Generator', 'mgovea', 'Sadret', 'kscheel', 'shottysteve', 'Deurklink', 'KaydeArcane'],
        type: 'remote',
        licence: 'MIT',
        targetApiVersion: 77,
        minApiVersion: 34,
        main: main
    });

})();
