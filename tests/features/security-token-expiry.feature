Feature: Token expiry

  Scenario: A token works while fresh and is rejected after it expires
    Given I hold a fresh token from the short-lived token server
    When I use the token immediately
    Then the token request status should be 404
    When I wait 1500 milliseconds
    And I use the token again
    Then the token request status should be 401