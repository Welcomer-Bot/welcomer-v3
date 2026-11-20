# Business processes

The three processes where several actors hand work to each other. They are drawn in the style of BPMN: one lane per actor, a circle for the start and a double circle for the end, a diamond for a decision. Journeys with a single actor are described in [journeys](./journeys.md) instead.

## P1 — Member arrival or departure

```mermaid
flowchart LR
  subgraph Member
    Start((A member joins or leaves))
  end
  subgraph Discord
    Notify[Tells the bot]
  end
  subgraph Bot
    Count[Records the arrival or departure and updates the member count]
    Active{Active configuration for this type?}
    HasImage{Image chosen?}
    Generate[Generates the image, default background if the link fails within 3 s]
    Generated{Image generated?}
    Replace[Replaces the variables]
    Post[Posts in the channel]
    Posted{Posted?}
    Record[Records the send: messages, embeds, images]
    Done(((Done)))
    Nothing(((Nothing sent)))
  end

  Start --> Notify --> Count --> Active
  Active -- no --> Nothing
  Active -- yes --> HasImage
  HasImage -- no --> Replace
  HasImage -- yes --> Generate --> Generated
  Generated -- yes --> Replace
  Generated -- "no: sent without image" --> Replace
  Replace --> Post --> Posted
  Posted -- yes --> Record --> Done
  Posted -- "no: no retry, no notice" --> Nothing
```

Rules: R-CFG-2, R-CFG-3, R-SRV-4, R-IMG-4, R-IMG-5, R-IMG-18, R-VAR-1, R-STA-5 to R-STA-8.

## P2 — Bot arrival on a server and departure

```mermaid
flowchart LR
  subgraph Manager
    Start((Chooses a server without the bot))
    Accept[Accepts the invitation]
    Kick((Kicks the bot))
  end
  subgraph Dashboard
    Invite[Opens the invitation in a new tab, server preselected]
    Reload[Manager reloads the dashboard]
    Shown(((Server shown with the bot)))
  end
  subgraph Discord
    Ask[Asks for the bot's permissions]
    Join[Adds the bot to the server]
    Left[Removes the bot from the server]
  end
  subgraph Bot
    Record[Records the server: no configuration, no image; old statistics found again]
    Clean[Deletes the configurations and images, keeps the statistics]
    Gone(((Server gone from the bot)))
  end

  Start --> Invite --> Ask --> Accept --> Join --> Record --> Reload --> Shown
  Kick --> Left --> Clean --> Gone
```

Rules: R-SRV-1 to R-SRV-6, R-ACC-10.

## P3 — Edit, validate and activate a configuration

```mermaid
flowchart LR
  subgraph Manager
    Start((Opens a configuration))
    Edit[Edits the draft]
    Validate[Validates]
    Activate[Activates it from the library]
  end
  subgraph Dashboard
    Preview[Shows the preview, errors and warnings]
    Access{Still has access?}
    Valid{Complete, not empty, within the limits in the worst case?}
    Changed{Changed by someone else since opened?}
    Save[Saves everything at once]
    Swap[Deactivates the other active configuration of the type and says which]
    Home(((Back to the dashboard home, draft lost)))
    Reload(((Refused, offers to reload)))
  end
  subgraph Bot
    Use(((Uses the new version from the next arrival or departure)))
  end

  Start --> Edit --> Preview --> Validate --> Access
  Access -- no --> Home
  Access -- yes --> Valid
  Valid -- no --> Edit
  Valid -- yes --> Changed
  Changed -- yes --> Reload
  Changed -- no --> Save --> Activate --> Swap --> Use
```

Activating is optional and can happen later, at any time; a configuration that was already active needs no activation and the bot uses the new version at once.

Rules: R-ACC-7 to R-ACC-9, R-CFG-9, R-CFG-12, R-CFG-13, R-EDT-1 to R-EDT-9, R-MSG-6 to R-MSG-9.
