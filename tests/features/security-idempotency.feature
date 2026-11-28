Feature: Idempotency key isolation between users

  Background:
    Given the API base url is set
    And I am logged in as a new user
    And an attacker user is logged in

  Scenario: Another user cannot replay my idempotent response
    Given I create a payment with a known idempotency key
    When the attacker replays the same payment request with the victim key
    Then the attacker should not receive the victim payment
    And the attacker response should not be a replay
    And the attacker request should create their own payment