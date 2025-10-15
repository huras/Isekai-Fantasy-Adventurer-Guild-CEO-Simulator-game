# Core Game Mechanics & Systems

## Game State & Progression

### Time System
- **Days**: Basic unit of time for quests, training, and daily operations
- **Weeks**: Recruitment cycles and longer-term planning
- **Progression**: Each day advances the game state and triggers various systems

### Core Resources
- **Money (Gold)**: Primary currency for all operations
- **Reputation**: Client trust and quest availability (0-100)
- **Influence**: Political power and special access (0-100)
- **Notoriety**: Fame and recognition in the adventuring world
- **Guild Experience**: Progress toward guild level increases

## Adventurer System

### Character Classes
Each adventurer belongs to one of five classes, each with unique strengths:

#### 🗡️ Warrior
- **Primary Stat**: Strength (STR)
- **Secondary Stat**: Defense
- **Role**: Front-line tank and physical damage dealer
- **Specialty**: High HP, physical combat, protection

#### 🔮 Mage
- **Primary Stat**: Magic (MAG)
- **Secondary Stat**: Resistance
- **Role**: Magical damage and utility
- **Specialty**: Elemental spells, magical defense, area damage

#### 🥷 Rogue
- **Primary Stat**: Skill
- **Secondary Stat**: Speed
- **Role**: Stealth and precision strikes
- **Specialty**: Critical hits, evasion, reconnaissance

#### ⛪ Cleric
- **Primary Stat**: Magic (MAG)
- **Secondary Stat**: Luck
- **Role**: Healing and support
- **Specialty**: Restoration magic, buffs, divine protection

#### 🏹 Ranger
- **Primary Stat**: Skill
- **Secondary Stat**: Speed
- **Role**: Ranged combat and wilderness expertise
- **Specialty**: Archery, tracking, outdoor survival

### Character Stats
Each adventurer has seven core stats that determine their effectiveness:

- **STR (Strength)**: Physical attack power and carrying capacity
- **MAG (Magic)**: Magical attack power and spell effectiveness
- **Skill**: Accuracy, critical hit chance, and technical abilities
- **Speed**: Movement speed, initiative in combat, and quest completion time
- **Luck**: Critical hit rate, item discovery, and random event outcomes
- **Defense**: Physical damage reduction
- **Resistance**: Magical damage reduction

### Character Progression
- **Level**: Increases through experience gained from quests
- **Training Level**: 0-15, affects quest success rate and loyalty
- **Loyalty**: 0-100, affects performance and chance to leave the guild
- **Experience**: Gained from quest completion and training

### Character Management
- **Upkeep**: Daily salary cost based on stats and experience
- **Personality**: Affects interactions and quest preferences
- **Appearance**: Visual representation with generated portraits
- **Skills**: Special abilities that unlock through progression
- **Romantic Interests**: Dating relationships and heart levels

## Quest System

### Quest Types
Five main categories of quests, each with different mechanics:

#### 🔎 Find Quests
- **Objective**: Locate specific items, people, or locations
- **Success Factors**: Skill, Speed, and party size
- **Risk Level**: Generally low to medium
- **Rewards**: Moderate gold and fame

#### 📦 Deliver Quests
- **Objective**: Transport items or people safely
- **Success Factors**: Speed, Defense, and party coordination
- **Risk Level**: Low to medium
- **Rewards**: Consistent income, good for beginners

#### 🛡️ Escort Quests
- **Objective**: Protect clients during travel
- **Success Factors**: Combat ability, party size, and coordination
- **Risk Level**: Medium to high
- **Rewards**: Higher gold, reputation bonuses

#### 🛡️ Protect Quests
- **Objective**: Defend locations or people from threats
- **Success Factors**: Combat ability, defense stats, and strategic positioning
- **Risk Level**: Medium to high
- **Rewards**: High gold, significant fame

#### ⚔️ Kill Quests
- **Objective**: Eliminate specific targets or clear areas
- **Success Factors**: Combat ability, party composition, and equipment
- **Risk Level**: High to extreme
- **Rewards**: Highest gold and fame, but highest risk

### Quest Difficulty System
Quests are ranked from H (easiest) to S (hardest):

- **H Rank**: Difficulty 1-2, suitable for beginners
- **G Rank**: Difficulty 2-3, basic adventurers
- **F Rank**: Difficulty 3-4, experienced teams
- **E Rank**: Difficulty 4-5, skilled adventurers
- **D Rank**: Difficulty 5-6, veteran teams
- **C Rank**: Difficulty 7-8, elite adventurers
- **B Rank**: Difficulty 9-10, master-level teams
- **A Rank**: Difficulty 12-13, legendary adventurers
- **S Rank**: Difficulty 14-15, only for the most powerful guilds

### Quest Mechanics
- **Duration**: Each quest takes 1-6 days to complete
- **Expiration**: Quests have time limits and expire if not accepted
- **Success Rate**: Calculated based on party stats vs. quest difficulty
- **Risk Assessment**: Low, Medium, High, or Extreme based on difficulty
- **Rewards**: Gold, fame, experience, and potential special items

## Combat System

### Battle Mechanics
- **Turn-based Combat**: Strategic turn order based on speed and initiative
- **Wave System**: Multiple enemy waves for longer quests
- **Party Coordination**: Multiple adventurers working together
- **Item Usage**: Consumables and equipment during combat

### Combat Factors
- **Attack Power**: Based on STR (physical) or MAG (magical)
- **Defense**: Damage reduction from armor and stats
- **Accuracy**: Hit chance based on Skill stat
- **Critical Hits**: Based on Skill and Luck stats
- **Speed**: Determines turn order and action frequency

### Combat Outcomes
- **Victory**: Complete quest objectives and earn rewards
- **Defeat**: Lose quest rewards and potentially lose party members
- **Retreat**: Abandon quest with partial penalties
- **Injury**: Party members may be wounded and require healing

## Economy System

### Income Sources
- **Quest Rewards**: Primary income from completed contracts
- **Guild Reputation**: Base daily income based on reputation level
- **Facility Income**: Specialized buildings that generate revenue
- **Market Trading**: Buying and selling items for profit
- **Quest Bonuses**: Bonuses for consecutive successful quests

### Expense Categories
- **Member Upkeep**: Daily salaries for all guild members
- **Facility Maintenance**: Ongoing costs for built structures
- **Training Costs**: Investment in member development
- **Equipment**: Purchasing and maintaining gear
- **Emergency Costs**: Healing, replacements, and repairs

### Market System
- **Dynamic Pricing**: Item prices fluctuate based on supply and demand
- **Market Trends**: Categories can be rising, falling, or stable
- **Supply and Demand**: Affects item availability and pricing
- **Seasonal Effects**: Certain items may be more valuable at different times

## Guild Management

### Facility System
- **Guild Hall**: Central building with quest success bonuses
- **Training Grounds**: Improves member training effectiveness
- **Recruitment Office**: Attracts better candidates
- **Workshop**: Crafting and equipment maintenance
- **Library**: Research and skill development
- **Kitchen**: Member morale and health management

### Facility Effects
- **Income Bonuses**: Additional daily revenue
- **Quest Success Bonuses**: Improved completion rates
- **Training Bonuses**: More effective member development
- **Recruitment Bonuses**: Better candidate quality
- **Upkeep Reduction**: Lower maintenance costs

### Upgrade System
- **Facility Levels**: Buildings can be upgraded multiple times
- **Guild Upgrades**: Special improvements that unlock new features
- **Requirements**: Prerequisites for advanced upgrades
- **Costs**: Investment required for improvements

## Recruitment System

### Candidate Generation
- **Weekly Cycles**: New candidates appear each week
- **Quality Scaling**: Better candidates appear as guild reputation increases
- **Class Distribution**: Various character classes available
- **Personality Variety**: Different traits and characteristics

### Recruitment Factors
- **Candidate Potential**: 1-10 rating affecting growth rate
- **Asking Salary**: Negotiable starting compensation
- **Experience Level**: Years of experience in the field
- **Reputation**: Personal standing in the adventuring community
- **Loyalty**: Likelihood to accept and stay with the guild

### Contract Negotiation
- **Salary Discussion**: Finding acceptable compensation levels
- **Benefits Package**: Additional incentives to attract talent
- **Contract Length**: Duration of employment agreement
- **Performance Bonuses**: Rewards for exceptional work

## Progression Systems

### Guild Leveling
- **Experience Points**: Gained from quests, achievements, and milestones
- **Level Thresholds**: Increasing XP requirements for each level
- **Unlockables**: New features and capabilities at higher levels
- **Prestige**: Recognition and respect in the adventuring world

### Member Development
- **Training Programs**: Structured improvement of skills and stats
- **Experience Gain**: Learning from quests and battles
- **Skill Unlocks**: New abilities through progression
- **Stat Growth**: Natural improvement through successful missions

### Achievement System
- **Milestone Tracking**: Recognition for significant accomplishments
- **Rewards**: Bonuses for completing achievements
- **Progress Tracking**: Visual representation of advancement
- **Long-term Goals**: Extended challenges for dedicated players

## Dating & Romance System

### Heart Level Progression
The dating system features a 10-level heart progression system inspired by Harvest Moon:

- **0 Hearts**: No Interest - They barely notice you
- **1-2 Hearts**: Acquaintance/Friend - Basic friendship level
- **3-4 Hearts**: Good Friend/Close Friend - Growing bond
- **5 Hearts**: Crush - Romantic tension developing
- **6 Hearts**: Dating - Official relationship status
- **7-8 Hearts**: In Love/Engaged - Deep commitment
- **9-10 Hearts**: Married/Soulmates - Perfect harmony

### Romantic Actions
Various activities to build relationships with different costs and heart gains:

- **Free Actions**: Conversation (0g, +1 heart, no cooldown)
- **Low Cost**: Flowers (50g, +2 hearts, 1 day cooldown)
- **Medium Cost**: Walks (100g, +2 hearts, 2 day cooldown)
- **High Cost**: Dinner dates (300g, +4 hearts, 4 day cooldown)
- **Premium**: Quest together (500g, +5 hearts, 7 day cooldown)
- **Ultimate**: Marriage proposal (1000g, +10 hearts, 30 day cooldown)

### Character Preferences
Each character has unique preferences based on:
- **Class**: Warriors prefer weapons, mages prefer magic items
- **Personality**: Heroic characters love brave gifts, scholars love books
- **Gender**: Some traits are gender-specific
- **Individual Traits**: Unique likes and dislikes for each character

### Relationship Management
- **Multiple Interests**: Up to 5 romantic interests simultaneously
- **Heart Decay**: Relationships deteriorate without regular interaction
- **Status Progression**: Automatic progression from single to dating to marriage
- **Special Events**: Valentine's Day and birthday bonuses
- **Cooldown System**: Actions have time restrictions to prevent spam

## Risk Management

### Quest Assessment
- **Success Probability**: Calculated based on party vs. quest difficulty
- **Risk Evaluation**: Understanding potential consequences
- **Party Composition**: Matching the right members to the right quests
- **Equipment Preparation**: Ensuring adequate gear for challenges

### Financial Planning
- **Cash Flow Management**: Balancing income and expenses
- **Emergency Funds**: Reserves for unexpected costs
- **Investment Timing**: When to spend vs. when to save
- **Risk vs. Reward**: Evaluating quest profitability

### Member Safety
- **Health Monitoring**: Tracking member condition and injuries
- **Retirement Planning**: Managing veteran members
- **Succession Planning**: Developing new talent
- **Loss Prevention**: Minimizing member casualties

---

*These core mechanics work together to create a complex, engaging management experience where every decision matters and long-term planning is essential for success.*

