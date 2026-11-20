# Privacy and personal data

Which personal data Welcomer keeps, why and for how long.

Welcomer keeps only the personal data it needs, for as long as it needs it (GDPR art. 5(1)(c) and (e)).

## Rules

### Personal data kept

- **R-PRV-1** Welcomer keeps only the personal data below.

  | Data                                                                                         | About            | Why                                 | Legal basis                                     | Kept                                                         |
  | -------------------------------------------------------------------------------------------- | ---------------- | ----------------------------------- | ----------------------------------------------- | ------------------------------------------------------------ |
  | Discord identifier, username, display name, avatar link                                      | a signed-in user | sign in, show who is signed in      | performance of the service, art. 6(1)(b)        | until their last session ends: 7 days at most after their last visit |
  | Discord authorization                                                                        | a signed-in user | read the user's servers and rights  | performance of the service, art. 6(1)(b)        | same                                                         |
  | Network address and device of each session                                                   | a signed-in user | security of the sessions            | legitimate interest: security, art. 6(1)(f)     | until the session ends: sign-out or 7 days                   |
  | Discord identifier                                                                           | an admin         | give access to the back-office      | legitimate interest: run the product, art. 6(1)(f) | while they are an admin                                   |
  | Technical logs, including the changes an admin makes on a server: when, which admin, which server, which configuration or image and its version | users and admins | security, finding faults | legitimate interest: security, art. 6(1)(f) | 30 days                                                      |

- **R-PRV-2** The email of a user is never asked for nor kept.
- **R-PRV-3** A user account is deleted when its last session ends, and created again at the next sign-in.
- **R-PRV-4** Technical logs never hold the content of a message nor the name of a member.
- **R-PRV-5** What a manager writes in a message or an image is the server's content. Welcomer posts it and does not use it for anything else.

### Members of a server

- **R-PRV-6** The bot uses a member's name, avatar and identifier only at the moment it posts the message, to replace the variables and generate the image. It never keeps them. Legal basis: legitimate interest of the server in greeting its members, art. 6(1)(f).
- **R-PRV-7** Statistics hold nothing about the member ([statistics](./statistics.md)).

### Sharing

- **R-PRV-8** Personal data is never sold, never used for advertising, and never given to a third party. Only the hosting providers that run the product handle it, on Welcomer's behalf.
- **R-PRV-9** Data obtained from Discord serves only the functions described in these documents.

### Rights of users

- **R-PRV-10** A user asks to access or delete their data on the support server. The Welcomer team handles the request by hand, within one month (GDPR art. 12(3)).
- **R-PRV-11** Anyone reports a problem with the bot or the dashboard on the support server. The link to it is in `/help` and on the dashboard. The team handles reports by hand.

## Examples

```gherkin
Rule: R-PRV-3 Account deleted with the last session

  Example: User does not come back
    Given Alex signed in once, on one device, on 1 March
    And Alex never comes back
    When the session ends on 8 March
    Then Alex's account and session are deleted
    And Alex's next sign-in creates a new account
```
