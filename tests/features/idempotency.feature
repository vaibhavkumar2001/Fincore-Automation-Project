Feature: Payment idempotency

  Background:
    Given the API base url is set
    And I am logged in as a new user

  Scenario: First request is not marked as replayed
    When I create a payment with amount 5000 and currency "INR"
    Then the response status should be 201
    And the response should not be marked as replayed

  Scenario: Replaying a capture request does not execute it twice
    Given a payment exists with amount 5000 and currency "INR"
    When I capture the payment with a new idempotency key
    Then the response status should be 200
    When I repeat the capture request with the same idempotency key
    Then the response status should be 200
    And the response header "Idempotent-Replayed" should equal "true"
    And the response field "status" should equal "captured"

  Scenario: Same key with a different amount is rejected and the payment is unchanged
    Given a payment exists with amount 5000 and currency "INR"
    When I repeat the create request with the same idempotency key and amount 9999
    Then the response status should be 422
    And the response should match the error contract
    And the stored payment amount should be 5000

  Scenario: Same key with a different currency is rejected
    Given a payment exists with amount 5000 and currency "INR"
    When I repeat the create request with the same idempotency key and currency "USD"
    Then the response status should be 422
    And the response should match the error contract

  Scenario: Same key on a different endpoint is treated as a new request
    Given a payment exists with amount 5000 and currency "INR"
    When I capture the payment using the idempotency key of the creation request
    Then the response status should be 200
    And the response should not be marked as replayed
    And the response field "status" should equal "captured"

  Scenario: Different keys with the same body create different payments
    Given a payment exists with amount 5000 and currency "INR"
    When I create another payment with a new idempotency key and the same body
    Then the response status should be 201
    And the response should not be marked as replayed
    And the payment id should differ from the first one

  Scenario: Replay returns the original response even after the payment state changed
    Given a payment exists with amount 5000 and currency "INR"
    And I capture the payment
    When I repeat the create request with the same idempotency key and the same body
    Then the response status should be 201
    And the response header "Idempotent-Replayed" should equal "true"
    And the response field "status" should equal "created"
    And the stored payment status should be "captured"