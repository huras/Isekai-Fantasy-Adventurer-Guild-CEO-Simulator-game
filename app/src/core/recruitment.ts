import type { Candidate, InventoryItem, ShopItem } from './types'
import { randomPortrait } from '../lib/portraits'

const personalities = ['heroic', 'cunning', 'stoic', 'chaotic', 'scholar'] as const
const femaleNames = ['Aria', 'Hana', 'Eira', 'Juno', 'Lyra', 'Mina', 'Nadia', 'Ophelia', 'Rin', 'Sera', 'Talia', 'Yuna']
const maleNames = ['Borin', 'Caius', 'Fynn', 'Garruk', 'Kai', 'Leon', 'Rook', 'Sylas']
const races = ['Human', 'Elf', 'Catfolk', 'Dragonkin']
const hairColors = ['black', 'brown', 'blonde', 'silver', 'red', 'white', 'blue']
const eyeColors = ['brown', 'green', 'blue', 'amber', 'violet', 'gold']
const styles = ['elegant', 'cute', 'athletic', 'mysterious', 'cheerful', 'stoic', 'noble', 'graceful']

function uid(prefix = 'id') { return `${prefix}_${Math.random().toString(36).slice(2, 9)}` }

export async function generateCandidates(notoriety: number, week: number): Promise<Candidate[]> {
  const classes = [
    { k: 'Warrior', primaryStat: 'str', secondaryStat: 'defense' },
    { k: 'Mage', primaryStat: 'mag', secondaryStat: 'resistance' },
    { k: 'Rogue', primaryStat: 'skill', secondaryStat: 'speed' },
    { k: 'Cleric', primaryStat: 'mag', secondaryStat: 'luck' },
    { k: 'Ranger', primaryStat: 'skill', secondaryStat: 'speed' },
  ]
  const baseCount = 3 + Math.floor(notoriety / 10)
  const count = Math.min(10, Math.max(3, baseCount))
  const result: Candidate[] = []
  for (let i = 0; i < count; i++) {
    const c = classes[Math.floor(Math.random() * classes.length)]
    const talent = Math.max(1, Math.min(10, 1 + Math.floor(notoriety / 10) + Math.floor(Math.random() * 4) - 1))
    const isFemale = Math.random() < 0.99
    const gender = isFemale ? 'female' : 'male' as const
    const genderIcon = isFemale ? '♀️' : '♂️'
    const race = races[Math.floor(Math.random() * races.length)]
    const hair = hairColors[Math.floor(Math.random() * hairColors.length)]
    const eyes = eyeColors[Math.floor(Math.random() * eyeColors.length)]
    const style = styles[Math.floor(Math.random() * styles.length)]
    const beauty = Math.max(6, Math.min(10, 6 + Math.floor(notoriety / 25) + (Math.floor(Math.random() * 3) - 1)))
    const appearance = `${genderIcon} ${style} ${race.toLowerCase()} with ${hair} hair and ${eyes} eyes; beauty ${beauty}/10`
    
    // Generate stats based on new system
    const str = Math.max(1, Math.min(20, Math.floor(Math.random() * 5) + 2 + (c.primaryStat === 'str' ? talent : 0)))
    const mag = Math.max(1, Math.min(20, Math.floor(Math.random() * 5) + 2 + (c.primaryStat === 'mag' ? talent : 0)))
    const skill = Math.max(1, Math.min(20, Math.floor(Math.random() * 5) + 2 + (c.primaryStat === 'skill' ? talent : 0)))
    const speed = Math.max(1, Math.min(10, 1 + Math.floor(Math.random() * 3) + (c.secondaryStat === 'speed' ? talent : 0)))
    const luck = Math.max(1, Math.min(20, Math.floor(Math.random() * 5) + 2 + (c.primaryStat === 'luck' ? talent : 0)))
    const defense = Math.max(1, Math.min(20, Math.floor(Math.random() * 5) + 2 + (c.secondaryStat === 'defense' ? talent : 0)))
    const resistance = Math.max(1, Math.min(20, Math.floor(Math.random() * 5) + 2 + (c.secondaryStat === 'resistance' ? talent : 0)))
    
    const hp = 10 + Math.floor(Math.random() * 11) + talent * 2
    const upkeep = 5 + Math.floor((str + mag + skill + speed + luck + defense + resistance) / 7)
    const minWeeks = 1
    const maxWeeks = 4
    const durationWeeks = Math.floor(Math.random() * (maxWeeks - minWeeks + 1)) + minWeeks
    const starterSkills = (
      c.k === 'Warrior' ? ['Slash'] :
      c.k === 'Mage' ? ['Fireball'] :
      c.k === 'Rogue' ? ['Backstab'] :
      c.k === 'Cleric' ? ['Heal'] :
      ['Aim']
    )
    // TEMP: give each candidate 1 random stackable item from catalog-like pool by id
    const starterItemIds = [
      '1', '1754849867652', '1754864404298', '1754864425962', '1754864563561', '1754864578481', '1754879231663'
    ] as const
    const starterItems: InventoryItem[] = [{ id: starterItemIds[Math.floor(Math.random() * starterItemIds.length)], qty: 1 }]

    result.push({
      id: uid('cand'),
      name: `${(isFemale ? femaleNames : maleNames)[Math.floor(Math.random() * (isFemale ? femaleNames.length : maleNames.length))]} ${Math.floor(Math.random() * 99) + 1}`,
      class: c.k,
      personality: personalities[Math.floor(Math.random() * personalities.length)],
      gender,
      appearance,
      avatar: randomPortrait(),
      stats: { str, mag, skill, speed, luck, defense, resistance, hp },
      upkeep,
      skills: starterSkills,
      weekAppeared: week,
      expiresOnWeek: week + durationWeeks,
      starterItems,
    })
  }
  return result
}


