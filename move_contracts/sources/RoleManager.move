module prediction_marketplace::role_manager {
    use std::signer;
    use aptos_std::table::{Self, Table};

    // Error codes
    const E_NOT_AUTHORIZED: u64 = 1;
    const E_INVALID_ROLE: u64 = 2;
    
    // Role constants
    const ROLE_USER: u8 = 0;
    const ROLE_CREATOR: u8 = 1;
    const ROLE_MOD: u8 = 2;
    const ROLE_ADMIN: u8 = 3;

    struct RoleManager has key {
        roles: Table<address, u8>,
    }

    public entry fun initialize(admin: &signer) acquires RoleManager {
        let admin_addr = signer::address_of(admin);
        assert!(admin_addr == @prediction_marketplace, E_NOT_AUTHORIZED);
        
        move_to(admin, RoleManager {
            roles: table::new(),
        });

        // Assign admin role to the deployer
          let role_manager = borrow_global_mut<RoleManager>(@prediction_marketplace);
            table::upsert(&mut role_manager.roles, admin_addr, ROLE_ADMIN);

    }
      public fun is_creator_or_admin(account_addr: address): bool acquires RoleManager {
        is_creator(account_addr) || is_admin(account_addr)
    }
      public fun is_mod_or_admin(account_addr: address): bool acquires RoleManager {
        is_mod(account_addr) || is_admin(account_addr)
    }
     public fun is_mod_or_creator(account_addr: address): bool acquires RoleManager {
        is_mod(account_addr) || is_creator(account_addr)
    }
public entry fun assign_role(admin: &signer, user_addr: address, role: u8) acquires RoleManager {
    let admin_addr = signer::address_of(admin);
    assert!(has_role(admin_addr, ROLE_ADMIN), E_NOT_AUTHORIZED);
    // assert!(role > ROLE_ADMIN, E_INVALID_ROLE);

    let role_manager = borrow_global_mut<RoleManager>(@prediction_marketplace);
    table::upsert(&mut role_manager.roles, user_addr, role);
}

   public fun has_role(user_addr: address, required_role: u8): bool acquires RoleManager {
        let role_manager = borrow_global<RoleManager>(@prediction_marketplace);
        if (table::contains(&role_manager.roles, user_addr)) {
            let user_role = *table::borrow(&role_manager.roles, user_addr);
            user_role >= required_role
        } else {
            required_role == ROLE_USER // Everyone has at least USER role
        }
    }

    // Add these new public functions
    public fun is_creator(user_addr: address): bool acquires RoleManager {
        has_role(user_addr, ROLE_CREATOR)
    }

    public fun is_mod(user_addr: address): bool acquires RoleManager {
        has_role(user_addr, ROLE_MOD)
    }

    public fun is_admin(user_addr: address): bool acquires RoleManager {
        has_role(user_addr, ROLE_ADMIN)
    }
}