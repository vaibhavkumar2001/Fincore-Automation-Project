Feature: Authentication

  Background:
    Given the API base url is set

  Scenario: Login with valid credentials returns a token
    Given a registered user exists
    When I log in with the correct password
    Then the response status should be 200
    And the response body should contain "token"

  Scenario: Login with a wrong password is rejected
    Given a registered user exists
    When I log in with a wrong password
    Then the response status should be 401
    And the response should match the error contract

  Scenario: Payments endpoint without a token is rejected
    When I send a GET request to "/payments/some-id"
    Then the response status should be 401
    And the response should match the error contract

  Scenario: Payments endpoint with an invalid token is rejected
    Given I use the token "invalid-token"
    When I send a GET request to "/payments/some-id"
    Then the response status should be 401
    And the response should match the error contract