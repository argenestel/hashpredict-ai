module prediction_marketplace::user_account {
    use std::string::{Self, String};
    use aptos_framework::account;
    use aptos_framework::event::{Self, EventHandle};
    use aptos_std::table::{Self, Table};
    use std::signer;
    use std::vector;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;
    use prediction_marketplace::chip_token;
    use aptos_framework::timestamp;

    // Error codes
    const E_NOT_INITIALIZED: u64 = 1;
    const E_ALREADY_INITIALIZED: u64 = 2;
    const E_NOT_AUTHORIZED: u64 = 3;
    const E_ACCOUNT_ALREADY_CLAIMED: u64 = 4;

    // Constants
    const INITIAL_REPUTATION: u64 = 100;
    const MAX_ALIAS_LENGTH: u64 = 20;

    struct UserAccount has key, copy, drop {
        alias: String,
        apt_balance: u64,
        chip_balance: u64,
        predictions: vector<PredictionEntry>,
        rank: u64,
        reputation: u64,
        total_predictions: u64,
        correct_predictions: u64,
    }

    struct PredictionEntry has store, drop, copy {
        prediction_id: u64,
        amount: u64,
        is_chip: bool,
        verdict: bool,
        outcome: bool, // true if the prediction was correct
            timestamp: u64, 

    }

    struct LeaderboardEntry has store, drop, copy {
    user_address: address,
    score: u64,
}

struct UserTracker has key {
    users: vector<address>,
}

struct Leaderboard has key {
    daily: vector<LeaderboardEntry>,
    weekly: vector<LeaderboardEntry>,
    all_time: vector<LeaderboardEntry>,
    last_daily_update: u64,
    last_weekly_update: u64,
}

    struct UnclaimedPredictions has key {
        predictions: Table<address, vector<PredictionEntry>>,
    }

    struct UserAccountEvents has key {
        register_events: EventHandle<RegisterEvent>,
        prediction_events: EventHandle<PredictionEvent>,
        reputation_change_events: EventHandle<ReputationChangeEvent>,
        account_claim_events: EventHandle<AccountClaimEvent>,
    }

    struct RegisterEvent has drop, store {
        user_address: address,
        alias: String,
    }

    struct PredictionEvent has drop, store {
        user_address: address,
        prediction_id: u64,
        amount: u64,
        is_chip: bool,
        verdict: bool,
    }

    struct ReputationChangeEvent has drop, store {
        user_address: address,
        old_reputation: u64,
        new_reputation: u64,
        reason: String,
    }

    struct AccountClaimEvent has drop, store {
        user_address: address,
        alias: String,
        predictions_claimed: u64,
    }

  public fun initialize(account: &signer) {
        let account_addr = signer::address_of(account);
        assert!(account_addr == @prediction_marketplace, E_NOT_AUTHORIZED);
        assert!(!exists<UserAccountEvents>(account_addr), E_ALREADY_INITIALIZED);

        move_to(account, UserAccountEvents {
            register_events: account::new_event_handle<RegisterEvent>(account),
            prediction_events: account::new_event_handle<PredictionEvent>(account),
            reputation_change_events: account::new_event_handle<ReputationChangeEvent>(account),
            account_claim_events: account::new_event_handle<AccountClaimEvent>(account),
        });

          move_to(account, UserTracker {
        users: vector::empty(),
    });
          move_to(account, Leaderboard {
        daily: vector::empty(),
        weekly: vector::empty(),
        all_time: vector::empty(),
        last_daily_update: 0,
        last_weekly_update: 0,
    });


        move_to(account, UnclaimedPredictions {
            predictions: table::new(),
        });
    }


    public fun add_user(user: address) acquires UserTracker {
    let tracker = borrow_global_mut<UserTracker>(@prediction_marketplace);
    if (!vector::contains(&tracker.users, &user)) {
        vector::push_back(&mut tracker.users, user);
    }
}

public entry fun register_user(account: &signer, alias: String) acquires UserAccountEvents {
    let account_addr = signer::address_of(account);
    assert!(!exists<UserAccount>(account_addr), E_ALREADY_INITIALIZED);
    assert!(string::length(&alias) <= MAX_ALIAS_LENGTH, 0);

    let user_account = UserAccount {
        alias,
        apt_balance: 0,
        chip_balance: 0,
        predictions: vector::empty(),
        rank: 0,
        reputation: INITIAL_REPUTATION,
        total_predictions: 0,
        correct_predictions: 0,
    };

    move_to(account, user_account);

    // Emit register event
    let events = borrow_global_mut<UserAccountEvents>(@prediction_marketplace);
    event::emit_event(&mut events.register_events, RegisterEvent {
        user_address: account_addr,
        alias,
    });
}




fun calculate_user_score(user_account: &UserAccount, current_time: u64, days: u64): u64 {
    let start_time = if (days == 0) { 0 } else { current_time - (days * 86400) };
    let recent_predictions = 0u64;
    let recent_correct_predictions = 0u64;

    let i = 0;
    let len = vector::length(&user_account.predictions);
    while (i < len) {
        let prediction = vector::borrow(&user_account.predictions, i);
        if (prediction.timestamp >= start_time) {
            recent_predictions = recent_predictions + 1;
            if (prediction.outcome) {
                recent_correct_predictions = recent_correct_predictions + 1;
            };
        };
        i = i + 1;
    };

    let accuracy = if (recent_predictions > 0) {
        ((recent_correct_predictions as u128) * 100) / (recent_predictions as u128)
    } else {
        0
    };

    (((user_account.reputation as u128) * accuracy) / 100) as u64
}

fun sort_leaderboard(leaderboard: &mut vector<LeaderboardEntry>) {
    let i = 1;
    let len = vector::length(leaderboard);
    while (i < len) {
        let j = i;
        while (j > 0 && vector::borrow(leaderboard, j - 1).score < vector::borrow(leaderboard, j).score) {
            vector::swap(leaderboard, j, j - 1);
            j = j - 1;
        };
        i = i + 1;
    };
}


public entry fun update_leaderboards() acquires Leaderboard, UserTracker, UserAccount {
    let current_time = timestamp::now_seconds();
    let leaderboard = borrow_global_mut<Leaderboard>(@prediction_marketplace);

    // Update daily leaderboard if 24 hours have passed
    if (current_time - leaderboard.last_daily_update >= 86400) {
        leaderboard.daily = calculate_leaderboard(1); // 1 day
        leaderboard.last_daily_update = current_time;
    };

    // Update weekly leaderboard if 7 days have passed
    if (current_time - leaderboard.last_weekly_update >= 604800) {
        leaderboard.weekly = calculate_leaderboard(7); // 7 days
        leaderboard.last_weekly_update = current_time;
    };

    // Update all-time leaderboard
    leaderboard.all_time = calculate_leaderboard(0); 
}

fun calculate_leaderboard(days: u64): vector<LeaderboardEntry> acquires UserTracker, UserAccount {
    let leaderboard = vector::empty<LeaderboardEntry>();
    let users = get_all_users();
    let current_time = timestamp::now_seconds();

    let i = 0;
    let len = vector::length(&users);
    while (i < len) {
        let user = *vector::borrow(&users, i);
        if (exists<UserAccount>(user)) {
            let user_account = borrow_global<UserAccount>(user);
            let score = calculate_user_score(user_account, current_time, days);
            vector::push_back(&mut leaderboard, LeaderboardEntry { user_address: user, score });
        };
        i = i + 1;
    };

    sort_leaderboard(&mut leaderboard);

    while (vector::length(&leaderboard) > 100) {
        vector::pop_back(&mut leaderboard);
    };

    leaderboard
}

    public fun record_prediction(user_addr: address, prediction_id: u64, amount: u64, is_chip: bool, verdict: bool) acquires UserAccount, UserAccountEvents, UnclaimedPredictions {
        let prediction_entry = PredictionEntry {
            prediction_id,
            amount,
            is_chip,
            verdict,
            outcome: false,
             timestamp: timestamp::now_seconds(),
        };

        if (exists<UserAccount>(user_addr)) {
            let user_account = borrow_global_mut<UserAccount>(user_addr);
            vector::push_back(&mut user_account.predictions, prediction_entry);
            user_account.total_predictions = user_account.total_predictions + 1;

            if (is_chip) {
                user_account.chip_balance = user_account.chip_balance - amount;
            } else {
                user_account.apt_balance = user_account.apt_balance - amount;
            };
        } else {
            let unclaimed_predictions = borrow_global_mut<UnclaimedPredictions>(@prediction_marketplace);
            if (!table::contains(&unclaimed_predictions.predictions, user_addr)) {
                table::add(&mut unclaimed_predictions.predictions, user_addr, vector::empty());
            };
            let user_predictions = table::borrow_mut(&mut unclaimed_predictions.predictions, user_addr);
            vector::push_back(user_predictions, prediction_entry);
        };

        // Emit prediction event
        let events = borrow_global_mut<UserAccountEvents>(@prediction_marketplace);
        event::emit_event(&mut events.prediction_events, PredictionEvent {
            user_address: user_addr,
            prediction_id,
            amount,
            is_chip,
            verdict,
        });
    }



    fun update_claimed_prediction_outcome(user_addr: address, prediction_id: u64, is_correct: bool) acquires UserAccount, UserAccountEvents {
        let user_account = borrow_global_mut<UserAccount>(user_addr);

        let i = 0;
        let len = vector::length(&user_account.predictions);
        while (i < len) {
            let prediction = vector::borrow_mut(&mut user_account.predictions, i);
            if (prediction.prediction_id == prediction_id) {
                prediction.outcome = is_correct;
                if (is_correct) {
                    user_account.correct_predictions = user_account.correct_predictions + 1;
                    update_reputation(user_addr, 5, is_correct);
                } else {
                    update_reputation(user_addr, 2, is_correct);
                };
                break
            };
            i = i + 1;
        };

        update_rank(user_addr);
    }

    fun update_unclaimed_prediction_outcome(user_addr: address, prediction_id: u64, is_correct: bool) acquires UnclaimedPredictions {
        let unclaimed_predictions = borrow_global_mut<UnclaimedPredictions>(@prediction_marketplace);
        if (table::contains(&unclaimed_predictions.predictions, user_addr)) {
            let user_predictions = table::borrow_mut(&mut unclaimed_predictions.predictions, user_addr);
            let i = 0;
            let len = vector::length(user_predictions);
            while (i < len) {
                let prediction = vector::borrow_mut(user_predictions, i);
                if (prediction.prediction_id == prediction_id) {
                    prediction.outcome = is_correct;
                    break
                };
                i = i + 1;
            };
        };
    }

    public entry fun claim_account(account: &signer, alias: String) acquires UserAccount, UserAccountEvents, UnclaimedPredictions {
        let account_addr = signer::address_of(account);
        assert!(!exists<UserAccount>(account_addr), E_ACCOUNT_ALREADY_CLAIMED);
        assert!(string::length(&alias) <= MAX_ALIAS_LENGTH, 0);

        let user_account = UserAccount {
            alias,
            apt_balance: 0,
            chip_balance: 0,
            predictions: vector::empty(),
            rank: 0,
            reputation: INITIAL_REPUTATION,
            total_predictions: 0,
            correct_predictions: 0,
        };

        let unclaimed_predictions = borrow_global_mut<UnclaimedPredictions>(@prediction_marketplace);
        if (table::contains(&unclaimed_predictions.predictions, account_addr)) {
            let claimed_predictions = table::remove(&mut unclaimed_predictions.predictions, account_addr);
            let i = 0;
            let len = vector::length(&claimed_predictions);
            while (i < len) {
                let prediction = vector::pop_back(&mut claimed_predictions);
                if (prediction.outcome) {
                    user_account.correct_predictions = user_account.correct_predictions + 1;
                };
                vector::push_back(&mut user_account.predictions, prediction);
                i = i + 1;
            };
            user_account.total_predictions = len;
        };

        move_to(account, user_account);
        update_rank(account_addr);

        // Emit account claim event
        let events = borrow_global_mut<UserAccountEvents>(@prediction_marketplace);
        event::emit_event(&mut events.account_claim_events, AccountClaimEvent {
            user_address: account_addr,
            alias,
            predictions_claimed: user_account.total_predictions,
        });
    }



public fun update_prediction_outcome(user_addr: address, prediction_id: u64, is_correct: bool) acquires UserAccount, UserAccountEvents, UnclaimedPredictions {
    if (exists<UserAccount>(user_addr)) {
        let user_account = borrow_global_mut<UserAccount>(user_addr);
        let i = 0;
        let len = vector::length(&user_account.predictions);
        while (i < len) {
            let prediction = vector::borrow_mut(&mut user_account.predictions, i);
            if (prediction.prediction_id == prediction_id) {
                prediction.outcome = is_correct;
                if (is_correct) {
                    user_account.correct_predictions = user_account.correct_predictions + 1;
                };
                user_account.total_predictions = user_account.total_predictions + 1;
                break
            };
            i = i + 1;
        };
        update_reputation(user_addr, if (is_correct) { 5 } else { 2 }, is_correct);
        update_rank(user_addr);
    } else {
        update_unclaimed_prediction_outcome(user_addr, prediction_id, is_correct);
    };
}

fun update_reputation(user_addr: address, change: u64, reason: bool) acquires UserAccount, UserAccountEvents {
    let user_account = borrow_global_mut<UserAccount>(user_addr);
    let old_reputation = user_account.reputation;
    
    if (reason) { // Positive change
        user_account.reputation = user_account.reputation + change;
    } else {
        user_account.reputation = if (user_account.reputation > change) user_account.reputation - change else 0;
    };

    let events = borrow_global_mut<UserAccountEvents>(@prediction_marketplace);
    event::emit_event(&mut events.reputation_change_events, ReputationChangeEvent {
        user_address: user_addr,
        old_reputation,
        new_reputation: user_account.reputation,
        reason: if (reason) { string::utf8(b"Correct prediction") } else { string::utf8(b"Incorrect prediction") },
    });
}

fun update_rank(user_addr: address) acquires UserAccount {
    let user_account = borrow_global_mut<UserAccount>(user_addr);
    let accuracy = if (user_account.total_predictions > 0) {
        ((user_account.correct_predictions as u128) * 100) / (user_account.total_predictions as u128)
    } else {
        0
    };
    user_account.rank = (((user_account.reputation as u128) * accuracy) / 100) as u64;
}

// Add this function to get user statistics
#[view]
public fun get_user_stats(user_addr: address): (u64, u64, u64, u64) acquires UserAccount {
    assert!(exists<UserAccount>(user_addr), E_NOT_INITIALIZED);
    let user_account = borrow_global<UserAccount>(user_addr);
    (
        user_account.rank,
        user_account.reputation,
        user_account.total_predictions,
        user_account.correct_predictions
    )
}  


    #[view]
    public fun get_user_info(user_addr: address): (String, u64, u64, u64, u64, u64, u64) acquires UserAccount {
        assert!(exists<UserAccount>(user_addr), E_NOT_INITIALIZED);
        let user_account = borrow_global<UserAccount>(user_addr);
        (
            user_account.alias,
            user_account.apt_balance,
            user_account.chip_balance,
            user_account.rank,
            user_account.reputation,
            user_account.total_predictions,
            user_account.correct_predictions
        )
    }

    #[view]
    public fun get_user_predictions(user_addr: address): vector<PredictionEntry> acquires UserAccount {
        assert!(exists<UserAccount>(user_addr), E_NOT_INITIALIZED);
        let user_account = borrow_global<UserAccount>(user_addr);
        *&user_account.predictions
    }

    public entry fun update_balances(account: &signer) acquires UserAccount {
        let account_addr = signer::address_of(account);
        assert!(exists<UserAccount>(account_addr), E_NOT_INITIALIZED);
        let user_account = borrow_global_mut<UserAccount>(account_addr);

        user_account.apt_balance = coin::balance<AptosCoin>(account_addr);
        user_account.chip_balance = chip_token::balance(account_addr);
    }

    #[view]
    public fun has_claimed_account(user_addr: address): bool {
        exists<UserAccount>(user_addr)
    }

    #[view]
    public fun get_unclaimed_predictions(user_addr: address): vector<PredictionEntry> acquires UnclaimedPredictions {
        let unclaimed_predictions = borrow_global<UnclaimedPredictions>(@prediction_marketplace);
        if (table::contains(&unclaimed_predictions.predictions, user_addr)) {
            *table::borrow(&unclaimed_predictions.predictions, user_addr)
        } else {
            vector::empty()
        }
    }

    #[view]
public fun get_daily_leaderboard(): vector<LeaderboardEntry> acquires Leaderboard {
    let leaderboard = borrow_global<Leaderboard>(@prediction_marketplace);
    *&leaderboard.daily
}

#[view]
public fun get_all_users(): vector<address> acquires UserTracker {
    let tracker = borrow_global<UserTracker>(@prediction_marketplace);
    *&tracker.users
}

#[view]
public fun get_weekly_leaderboard(): vector<LeaderboardEntry> acquires Leaderboard {
    let leaderboard = borrow_global<Leaderboard>(@prediction_marketplace);
    *&leaderboard.weekly
}

#[view]
public fun get_all_time_leaderboard(): vector<LeaderboardEntry> acquires Leaderboard {
    let leaderboard = borrow_global<Leaderboard>(@prediction_marketplace);
    *&leaderboard.all_time
}


}