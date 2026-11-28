Feature: Cross-user access (IDOR)

  Background:
    Given the API base url is set
    And I am logged in as a new user
    And an attacker user is logged in

  Scenario: Another user cannot read my payment
    Given a payment exists with amount 5000 and currency "INR"
    When the attacker fetches the victim payment
    Then the attacker request should be rejected with status 403

  Scenario: Another user cannot capture my payment
    Given a payment exists with amount 5000 and currency "INR"
    When the attacker captures the victim payment
    Then the attacker request should be rejected with status 403
    And the stored payment status should be "created"

  Scenario: Another user cannot refund my payment
    Given a payment exists with amount 5000 and currency "INR"
    And I capture the payment
    When the attacker refunds the victim payment
    Then the attacker request should be rejected with status 403
    And the stored payment status should be "captured"

  Scenario: Another user cannot read my transfer
    Given a source account exists with currency "USD" and balance 500
    And a destination account exists with currency "USD" and balance 0
    And I transfer 100 from the source to the destination account
    When the attacker fetches the victim transfer
    Then the attacker request should be rejected with status 403

  Scenario: Another user cannot read my account
    Given a source account exists with currency "USD" and balance 500
    When the attacker fetches the victim account
    Then the attacker request should be rejected with status 403

  Scenario: Another user cannot read my account ledger
    Given a source account exists with currency "USD" and balance 500
    When the attacker fetches the victim account ledger
    Then the attacker request should be rejected with status 403