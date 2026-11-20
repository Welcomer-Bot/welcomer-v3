# User journeys

What each actor does with Welcomer, written as user stories: "As a …, I want … so that …". Each story names the rules that decide its details. Stories are ordered by importance within each actor.

## Visitor

- **J-VIS-1** As a visitor, I want to read what the bot does so that I can decide to add it to my server. Screen: landing. Rules: R-PUB-1.
- **J-VIS-2** As a visitor, I want to invite the bot from the landing page so that I can start in one click. Rules: R-SRV-1, R-SRV-2.
- **J-VIS-3** As a visitor, I want to see whether the bot works, and which Discord connection serves my server, so that I know if a missing message is my fault or an outage. Screen: status page. Rules: R-PUB-4 to R-PUB-9.

## User

- **J-USR-1** As a user, I want to sign in with my Discord account so that I do not need another password. Rules: R-ACC-1, R-ACC-2.
- **J-USR-2** As a user, I want to see the servers I manage, those with the bot first, so that I reach my server fast. Screen: dashboard home. Rules: R-ACC-10, R-ACC-11.
- **J-USR-3** As a user, I want to invite the bot to a server I manage where it is absent, with that server already chosen, so that I do not pick it again. Rules: R-SRV-1.
- **J-USR-4** As a user, I want to sign out of this device only so that my other devices stay signed in. Rules: R-ACC-3, R-ACC-4.

## Server manager

### Set up the first message

- **J-MGR-1** As a server manager, I want to create a welcome configuration that starts from a ready message so that I only adapt it. Rules: R-CFG-5 to R-CFG-10, R-MSG-10.
- **J-MGR-2** As a server manager, I want to choose the channel where the message is posted, and be warned if the bot cannot post there, so that the message reaches members. Rules: R-CFG-8, R-EDT-4.
- **J-MGR-3** As a server manager, I want to write the text and embeds with variables and see a preview so that I know exactly what members will see. Rules: R-MSG-1 to R-MSG-6, R-VAR-1 to R-VAR-4, R-EDT-1, R-EDT-2.
- **J-MGR-4** As a server manager, I want the dashboard to refuse a message that could break a Discord limit, and warn me when I get close, so that a member with a long name never makes the post fail. Rules: R-MSG-7 to R-MSG-9, R-EDT-3.
- **J-MGR-5** As a server manager, I want to validate my edits only when I am ready so that members never see a half-done message. Rules: R-EDT-5 to R-EDT-8.
- **J-MGR-6** As a server manager, I want to activate the configuration so that the bot starts posting it. Rules: R-CFG-2, R-CFG-12, R-CFG-13.
- **J-MGR-7** As a server manager, I want to test the active configuration with `/test` so that I see the real result without waiting for a member. Rules: R-CMD-3 to R-CMD-5.

### Add a custom image

- **J-MGR-8** As a server manager, I want to create an image with a layout, the member's avatar and name, and my own texts, so that each new member gets a personal picture. Rules: R-IMG-1, R-IMG-2, R-IMG-6 to R-IMG-14.
- **J-MGR-9** As a server manager, I want to give a background as a color or a link, and be warned if the link does not work, so that the image always looks right. Rules: R-IMG-15 to R-IMG-18.
- **J-MGR-10** As a server manager, I want to choose an image in a configuration and where it goes in the message so that it fits my embeds. Rules: R-CFG-5, R-IMG-19.

### Manage the library

- **J-MGR-11** As a server manager, I want to keep several configurations of a type and switch the active one so that I can prepare a seasonal message in advance. Rules: R-CFG-6, R-CFG-11 to R-CFG-13.
- **J-MGR-12** As a server manager, I want to delete a configuration or an image, with a warning of what it affects, so that I do not break my setup by mistake. Rules: R-CFG-14, R-CFG-15, R-IMG-3.
- **J-MGR-13** As a server manager, I want to see when a configuration's channel no longer exists so that I fix it. Rules: R-CFG-16, R-CFG-17.
- **J-MGR-14** As a server manager, I want to be told when another manager changed what I am editing so that I never overwrite their work. Rules: R-EDT-9.

### Follow the activity

- **J-MGR-15** As a server manager, I want to see arrivals, departures and the balance over a period so that I follow the growth of my server. Screen: statistics. Rules: R-STA-1, R-STA-2, R-STA-8, R-STA-10 to R-STA-15.
- **J-MGR-16** As a server manager, I want to see what each configuration sent so that I know which one is used. Rules: R-STA-5 to R-STA-7, R-STA-16, R-STA-17.

### In Discord

- **J-MGR-17** As a server manager, I want `/help` to explain the setup and list the variables so that I learn without leaving Discord. Rules: R-CMD-1.
- **J-MGR-18** As a server manager, I want `/status` to tell me whether the bot is connected so that I check it from my server. Rules: R-CMD-2.

## Member of a server

The member does not use Welcomer; the bot acts for them.

- **J-MEM-1** As a member who joins, I get the welcome message of the server, with my name and, if set, my image. Rules: R-CFG-2, R-VAR-1, R-IMG-4, R-IMG-5.
- **J-MEM-2** As a member who leaves, the server gets the goodbye message. Rules: R-CFG-2.
- **J-MEM-3** As a member, nothing about me is kept by Welcomer. Rules: R-PRV-6, R-PRV-7.

## Admin

- **J-ADM-1** As an admin, I want to find a server by name or identifier so that I can help its managers. Screen: back-office. Rules: R-ADM-1, R-ADM-3, R-ADM-4.
- **J-ADM-2** As an admin, I want to open and fix a server's configurations as its managers would so that I can solve a support request. Rules: R-ADM-5 to R-ADM-7.

## Welcomer team

- **J-TEAM-1** As the Welcomer team, I want to receive access, deletion and problem requests on the support server so that I answer them within one month. Rules: R-PRV-10, R-PRV-11.
