# Statistics

What managers learn about arrivals, departures and what the bot sent.

## Rules

### What is kept

- **R-STA-1** Statistics are anonymous. They describe the server and its configurations, never the person who joined or left.
- **R-STA-2** Per server: member arrivals, member departures. Per configuration: messages sent, embeds sent, images sent.
- **R-STA-3** **Events** log each arrival, departure or send with its exact time. They are kept one week, to save storage.
- **R-STA-4** **Daily totals** group the events of each day. Grouping loses the exact time of each event. They are kept forever, even after the bot leaves the server.

### What is counted

- **R-STA-5** Only what was posted counts. A message that could not be posted counts nothing: no message, no embed, no image.
- **R-STA-6** A message posted without its image, because the image could not be generated, counts as a message and its embeds, not as an image.
- **R-STA-7** Embeds are the number of embeds of the posted message, from 0 to 10. An image attached under the message is not an embed.
- **R-STA-8** Every arrival and every departure counts, even when nothing is sent. A bot account counts like any other member.
- **R-STA-9** A test does not count.

### Days

- **R-STA-10** Days are cut in UTC for every server. The dashboard says so.
- **R-STA-11** A day without activity shows 0.
- **R-STA-12** The total of the current day is up to date as the day goes, and is marked as in progress.

### Statistics page

- **R-STA-13** Filters: period, message type, configuration. The message type and configuration filters apply to the messages sent only; arrivals and departures depend on neither.
- **R-STA-14** Periods: last 24 hours and last 7 days, from the events, grouped by hour; last 30 days, last 90 days, last year and since the start, from the daily totals, by day. The hourly periods slide hour by hour up to now. The daily periods count whole UTC days and end with today, in progress (R-STA-12): 30 days is today and the 29 days before. The last year is 365 days. Since the start begins with the first day the server has data.
- **R-STA-15** The page shows charts of member arrivals and departures, and for the chosen period: total arrivals, total departures, and the balance (arrivals minus departures).
- **R-STA-16** The page shows messages, embeds and images sent, per configuration, and in total per message type.
- **R-STA-17** The statistics of a deleted configuration appear only in the totals of its server and its message type.

## Examples

```gherkin
Rule: R-STA-5 Only what was posted counts

  Example: Channel gone
    Given the active welcome configuration has 2 embeds and an image
    And its channel was deleted on Discord
    When a member joins
    Then the arrival counts
    And no message, no embed and no image count

  Example: Image failed, message posted
    Given the active welcome configuration has 2 embeds and an image
    And the image cannot be generated
    When a member joins
    Then 1 message and 2 embeds count
    And no image counts

Rule: R-STA-10 Days in UTC

  Example: Late evening in New York
    Given a member joins on 3 March at 21:00 in New York, which is 4 March 02:00 UTC
    When the manager looks at the daily totals
    Then the arrival counts on 4 March

Rule: R-STA-17 Deleted configuration

  Example: Totals keep the history
    Given the welcome configuration "Summer" sent 40 messages in March
    When the manager deletes "Summer"
    Then "Summer" no longer appears in the list of configurations of the statistics page
    And the March total of welcome messages still includes its 40 messages
```
