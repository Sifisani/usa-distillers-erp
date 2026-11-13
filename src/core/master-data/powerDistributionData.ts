/**
 * USA Distillers - Great Usuthu Plant Single-Line Diagram (SLD) v2.0 & Block Diagram Topology
 *
 * 100% faithful digital model of official engineering drawings:
 * - USA_Distillers_Power_Distribution_2.0_19ced4cd.pdf
 * - USA_Distillers_Power_Distribution_Block_Diagram_Updated_ea6d85db.pdf
 * Drawn by: Bongani Dlamini & Sicelo Simelane (2021/04/14) | File NO: 1 | Folio: 1/1
 */

import {
  FeederPanelId,
  TransformerSource,
  ElectricalFeederNodeMeta,
  Equipment,
  PowerDistributionNode
} from '../../types';

export const DEFAULT_POWER_NODES: PowerDistributionNode[] = [
  // =========================================================================
  // TIER 1A: OLD TURBINE ALTERNATOR - STEP UP PATH (DECOMMISSIONED)
  // =========================================================================
  {
    id: 'OLD_TURBINE',
    code: 'T/A (OLD)',
    name: 'Old Turbine Alternator',
    category: 'SOURCE',
    groupSection: 'OLD_TURBINE',
    transformerSource: 'HV_11KV',
    brand: 'Legacy Steam Turbine',
    model: '3 MW Alternator',
    breakerType: 'Unrecorded',
    ratedAmps: 344,
    operatingState: 'DECOMMISSIONED',
    voltage: '6300 V',
    kva: 3750,
    powerMw: 3.0,
    primaryAmps: 344,
    frequencyHz: 50,
    interlockStatus: 'NOT_APPLICABLE',
    lotoIsolationProcedure: 'Equipment permanently decommissioned. Verify C1 racked out and locked off.',
    location: 'Old Power House Turbine Bay',
    description: 'Decommissioned 3.0 MW (3750 kVA) 6.3kV steam turbo-alternator.'
  },
  {
    id: 'OLD_STEP_UP_TX',
    code: 'STEP-UP TX',
    name: 'Old Turbine Step-Up Transformer',
    category: 'STEP_UP_TX',
    groupSection: 'OLD_TURBINE',
    transformerSource: 'HV_11KV',
    parentNodeId: 'OLD_TURBINE',
    brand: 'Legacy Oil Transformer',
    model: '4000 kVA 6.6/11kV',
    breakerType: 'Unrecorded',
    ratedAmps: 209.95,
    operatingState: 'DECOMMISSIONED',
    voltage: '6600 / 11000 V',
    kva: 4000,
    primaryAmps: 349.91,
    secondaryAmps: 209.95,
    frequencyHz: 50,
    interlockStatus: 'NOT_APPLICABLE',
    lotoIsolationProcedure: 'Isolated upstream and downstream via C1 VCB.',
    location: 'Old Turbine Transformer Compound',
    description: '4000 kVA 6.6/11 kV step-up transformer for decommissioned old turbine.'
  },
  {
    id: 'C1',
    code: 'C1',
    name: 'C1 - Old Turbine VCB',
    category: 'BREAKER',
    groupSection: 'OLD_TURBINE',
    transformerSource: 'HV_11KV',
    parentNodeId: 'OLD_STEP_UP_TX',
    brand: 'GEC',
    model: 'AGV-800/20/S',
    breakerType: 'VCB',
    frameSize: '800 A',
    ratedAmps: 800,
    operatingState: 'DECOMMISSIONED',
    voltage: '11 kV',
    interlockStatus: 'NOT_APPLICABLE',
    lotoIsolationProcedure: 'VCB racked out / locked open. Do not rack in without HV engineering permit.',
    location: 'Main 11kV HV Switchgear Room',
    description: 'GEC AGV-800/20/S Vacuum Circuit Breaker isolating decommissioned old turbine path.'
  },

  // =========================================================================
  // TIER 1B: EEC INCOMING SUPPLY
  // =========================================================================
  {
    id: 'EEC_SUPPLY',
    code: 'EEC 11KV',
    name: 'EEC Supply (Eswatini Electricity Company)',
    category: 'SOURCE',
    groupSection: 'EEC_SUPPLY',
    transformerSource: 'HV_11KV',
    brand: 'Eswatini Electricity Company',
    model: '11 kV Utility Overhead/Cable Intake',
    breakerType: 'Unrecorded',
    ratedAmps: null,
    operatingState: 'CLOSED',
    voltage: '11 kV',
    frequencyHz: 50,
    interlockStatus: 'NOT_APPLICABLE',
    lotoIsolationProcedure: 'Utility isolation requires formal EEC Switching Request & Permit to Work.',
    location: 'Plant Main HV Intake Substation',
    description: 'Primary 11 kV national utility grid connection from Eswatini Electricity Company.'
  },
  {
    id: 'METERING_TX',
    code: 'METERING TX',
    name: 'EEC Metering Transformer',
    category: 'METERING_TX',
    groupSection: 'EEC_SUPPLY',
    transformerSource: 'HV_11KV',
    parentNodeId: 'EEC_SUPPLY',
    brand: 'EEC Metering Unit',
    model: 'CT/VT 11kV Metering Cubicle',
    breakerType: 'Unrecorded',
    ratedAmps: null,
    operatingState: 'CLOSED',
    voltage: '11 kV',
    frequencyHz: 50,
    interlockStatus: 'NOT_APPLICABLE',
    lotoIsolationProcedure: 'Sealed EEC revenue metering cubicle. Authorized HV access only.',
    location: 'Main 11kV Substation Intake',
    description: 'Revenue CT/VT metering transformer monitoring plant grid import.'
  },
  {
    id: 'C2',
    code: 'C2',
    name: 'C2 - EEC 11kV Incomer Breaker',
    category: 'BREAKER',
    groupSection: 'EEC_SUPPLY',
    transformerSource: 'HV_11KV',
    parentNodeId: 'METERING_TX',
    brand: 'Unrecorded',
    model: '11 kV Switchgear',
    breakerType: 'Unrecorded',
    ratedAmps: null,
    operatingState: 'CLOSED',
    voltage: '11 kV',
    interlockStatus: 'NOT_APPLICABLE',
    lotoIsolationProcedure: 'Open C2 to isolate plant 11kV busbar from EEC grid supply. Verify New Turbine C3 status first.',
    location: 'Main 11kV HV Switchgear Room',
    description: '11 kV main incoming breaker feeding from Metering Transformer onto 11kV Busbar.'
  },

  // =========================================================================
  // TIER 1C: NEW TURBINE ALTERNATOR
  // =========================================================================
  {
    id: 'NEW_TURBINE',
    code: 'T/A (NEW)',
    name: 'New Turbine Alternator',
    category: 'SOURCE',
    groupSection: 'NEW_TURBINE',
    transformerSource: 'HV_11KV',
    brand: 'Co-Gen Turbo Alternator',
    model: '3.8 MW 11kV Unit',
    breakerType: 'Unrecorded',
    ratedAmps: 236,
    operatingState: 'CLOSED',
    voltage: '11 kV',
    kva: 4223.96,
    powerMw: 3.8,
    primaryAmps: 236,
    frequencyHz: 50,
    interlockStatus: 'NOT_APPLICABLE',
    lotoIsolationProcedure: 'Trip turbine governor, confirm reverse-power drop, open C3 VCB, engage shaft lock.',
    location: 'New Power House Turbine Floor',
    description: 'Active steam co-generation turbo-alternator (4223.96 kVA, 3.8 MW, 11 kV, 236 A, 50 Hz).'
  },
  {
    id: 'C3',
    code: 'C3',
    name: 'C3 - New Turbine VCB',
    category: 'BREAKER',
    groupSection: 'NEW_TURBINE',
    transformerSource: 'HV_11KV',
    parentNodeId: 'NEW_TURBINE',
    brand: 'Eaton Cutler-Hammer',
    model: 'VCP-W',
    breakerType: 'VCB',
    frameSize: '12 kV VCP-W',
    ratedAmps: null,
    operatingState: 'CLOSED',
    voltage: '11 kV',
    interlockStatus: 'NOT_APPLICABLE',
    lotoIsolationProcedure: 'Open C3 Vacuum Circuit Breaker, rack out to Test/Disconnected position, lock shutter.',
    location: 'Main 11kV HV Switchgear Room',
    description: 'Eaton Cutler-Hammer VCP-W Vacuum Circuit Breaker connecting New Turbine to 11kV Busbar.'
  },

  // =========================================================================
  // TIER 2: 11 KV MAIN BUSBAR
  // =========================================================================
  {
    id: 'BUS_11KV',
    code: '11 KV BUSBAR',
    name: 'Main 11 kV Distribution Busbar',
    category: 'BUSBAR',
    groupSection: 'HV_BUS',
    transformerSource: 'HV_11KV',
    brand: 'HV Copper Busbar',
    model: '11 kV 3-Phase Rail',
    breakerType: 'Unrecorded',
    ratedAmps: null,
    operatingState: 'CLOSED',
    voltage: '11 kV',
    frequencyHz: 50,
    interlockStatus: 'NOT_APPLICABLE',
    lotoIsolationProcedure: 'Total dead-bus isolation requires opening C2 (EEC) and C3 (New Turbine) and earthing bus.',
    location: 'Main 11kV HV Switchgear Room',
    description: 'Central 11 kV medium-voltage busbar distributing power to Tx1, Tx2, and Tx3.'
  },

  // =========================================================================
  // TIER 3A: TRANSFORMER 1 PATH (1600 kVA)
  // =========================================================================
  {
    id: 'TX1_FUSE',
    code: 'Tx1 Fuse',
    name: 'Tx 1 Fuse | 80 A',
    category: 'HV_FUSE',
    groupSection: 'TX1',
    transformerSource: 'Tx1',
    parentNodeId: 'BUS_11KV',
    brand: 'Oil-Immersed Switchgear',
    model: 'Fused Switch-Disconnector',
    breakerType: 'Fused Switch-Disconnector',
    frameSize: '80 A HV Fuse',
    ratedAmps: 80,
    operatingState: 'CLOSED',
    voltage: '11 kV',
    interlockStatus: 'NOT_APPLICABLE',
    lotoIsolationProcedure: 'Open Tx1 HV oil-immersed switch-disconnector after shedding Tx1 LV load on C4.',
    location: 'Main Substation HV Bay 1',
    description: '80 A Oil-immersed Fused Switch-disconnector protecting Step-Down Transformer 1.'
  },
  {
    id: 'TX1',
    code: 'Tx1',
    name: 'Step Down Transformer : 1 (Tx1)',
    category: 'TRANSFORMER',
    groupSection: 'TX1',
    transformerSource: 'Tx1',
    parentNodeId: 'TX1_FUSE',
    brand: 'Power Transformer',
    model: '1600 kVA 11000/415V',
    breakerType: 'Unrecorded',
    ratedAmps: 2225,
    operatingState: 'CLOSED',
    voltage: '11000 / 415 V',
    kva: 1600,
    primaryAmps: 83.98,
    secondaryAmps: 2225.0,
    frequencyHz: 50,
    interlockStatus: 'NOT_APPLICABLE',
    lotoIsolationProcedure: 'Isolate HV side via Tx1 Fuse (80A) AND LV side via C4 (2500A ACB) before work.',
    location: 'Transformer Bund 1',
    description: '1600 kVA step-down transformer (11000/415V, 83.98A / 2225.0A) feeding Tx1 Main Control Centre.'
  },
  {
    id: 'C4',
    code: 'C4',
    name: 'C4 - Tx1 Main LV Incomer',
    category: 'BREAKER',
    groupSection: 'TX1',
    transformerSource: 'Tx1',
    parentNodeId: 'TX1',
    brand: 'Chint',
    model: 'NA1-3200',
    breakerType: 'ACB',
    frameSize: '3200 A Frame',
    ratedAmps: 2500,
    operatingState: 'CLOSED',
    voltage: '400 / 415 V',
    interlockStatus: 'NONE_HAZARD',
    interlockPartnerId: 'C7',
    interlockHazardNote:
      'CRITICAL DESIGN HAZARD: C4 (Tx1 Incomer 2500A) is NOT mechanically or electrically interlocked with C7 (680kVA Gen Set 1250A). Closing both simultaneously causes catastrophic out-of-phase back-feed / arc-flash fault on Tx1 MCC Busbar.',
    lotoIsolationProcedure: 'Open C4 ACB, rack out, verify C7 (Gen Set) is OPEN & locked before energizing or servicing Tx1 Busbar.',
    location: 'Tx1 Main Control Centre Incomer Panel',
    description: 'Chint NA1-3200 Air Circuit Breaker (rated 2500A) feeding Tx1 Main Control Centre Busbar.'
  },
  {
    id: 'BUS_TX1',
    code: 'Tx1 MCC',
    name: 'Tx1 Main Control Centre Busbar',
    category: 'CONTROL_CENTRE',
    groupSection: 'TX1',
    transformerSource: 'Tx1',
    parentNodeId: 'C4',
    brand: 'Main Switchboard',
    model: '400V Busbar',
    breakerType: 'Unrecorded',
    ratedAmps: 2500,
    operatingState: 'CLOSED',
    voltage: '400 V',
    frequencyHz: 50,
    interlockStatus: 'NONE_HAZARD',
    interlockPartnerId: 'C7',
    interlockHazardNote:
      'Dual-fed busbar (C4 Tx1 + C7 Gen Set) WITHOUT changeover interlock. Strict manual switching verification required.',
    lotoIsolationProcedure: 'MUST isolate BOTH C4 (Tx1) AND C7 (Gen Set) and test dead before touching Tx1 MCC busbars.',
    location: 'Tx1 Main Switchroom',
    description: '400V Motor Control Centre busbar supplying Gen Set tie C7, MCC 1 (C8), Boiler 2 (C9), and MCC 4 (C10).'
  },

  // =========================================================================
  // TIER 4A: TX1 BRANCHES (C7 GEN SET, C8 MCC 1, C9 BOILER 2, C10 MCC 4)
  // =========================================================================
  {
    id: 'GEN_SET',
    code: 'GEN SET',
    name: 'Emergency Diesel Gen Set',
    category: 'SOURCE',
    groupSection: 'TX1',
    transformerSource: 'Tx1',
    parentNodeId: 'C7',
    brand: 'Diesel Generator Set',
    model: '680 kVA 400V Alternator',
    breakerType: 'Unrecorded',
    ratedAmps: 981,
    operatingState: 'OPEN',
    voltage: '400 V',
    kva: 680,
    primaryAmps: 981,
    frequencyHz: 50,
    interlockStatus: 'NONE_HAZARD',
    interlockPartnerId: 'C4',
    interlockHazardNote:
      'No interlock with C4 (Tx1). Confirm C4 is completely OPEN before closing C7 to put Gen Set onto Tx1 MCC Busbar.',
    lotoIsolationProcedure: 'Switch generator controller to OFF/LOCKED, isolate starter batteries, lock out C7 ACB.',
    location: 'Generator House',
    description: '680 kVA (400 V, 981 A, 50 Hz) standby diesel generator feeding Tx1 MCC via C7.'
  },
  {
    id: 'C7',
    code: 'C7',
    name: 'C7 - Gen Set Incomer Breaker',
    category: 'BREAKER',
    groupSection: 'TX1',
    transformerSource: 'Tx1',
    parentNodeId: 'BUS_TX1',
    brand: 'ABB',
    model: 'SACE E1B 12',
    breakerType: 'ACB',
    frameSize: '1250 A',
    ratedAmps: 1250,
    operatingState: 'OPEN',
    voltage: '400 V',
    interlockStatus: 'NONE_HAZARD',
    interlockPartnerId: 'C4',
    interlockHazardNote:
      'CRITICAL DESIGN HAZARD: C7 (ABB SACE E1B 12 1250A) has NO hardware interlock with C4 (Chint NA1-3200 2500A). Electrician must visually confirm C4 is OPEN before closing C7.',
    lotoIsolationProcedure: 'Open C7 ACB, rack out during normal grid/turbine supply, apply LOTO padlock.',
    location: 'Tx1 Main Control Centre - Gen Set Panel',
    description: 'ABB SACE E1B 12 Air Circuit Breaker (rated 1250A) connecting 680kVA Gen Set to Tx1 Busbar.'
  },
  {
    id: 'C8',
    code: 'C8',
    name: 'MCC 1 (Distillation & Stills)',
    category: 'BREAKER',
    groupSection: 'TX1',
    transformerSource: 'Tx1',
    parentNodeId: 'BUS_TX1',
    feederPanelId: 'MCC 1',
    brand: 'Unrecorded',
    model: 'Nameplate Unrecorded',
    breakerType: 'Unrecorded',
    ratedAmps: null,
    operatingState: 'CLOSED',
    voltage: '400 V',
    interlockStatus: 'NOT_APPLICABLE',
    lotoIsolationProcedure: 'Open & lock out feeder breaker C8 at Tx1 Main Control Centre. Verify zero voltage at MCC 1 incomer.',
    location: 'Distillation Stillhouse / MCC 1 Room',
    description: 'Feeder C8 supplying Distillation Stillhouse pumps, wash columns, evaporators, and stillhouse fans.'
  },
  {
    id: 'C9',
    code: 'C9',
    name: 'Boiler 2 Electrical Board',
    category: 'BREAKER',
    groupSection: 'TX1',
    transformerSource: 'Tx1',
    parentNodeId: 'BUS_TX1',
    feederPanelId: 'Boiler 2',
    brand: 'Unrecorded',
    model: 'Nameplate Unrecorded',
    breakerType: 'Unrecorded',
    ratedAmps: null,
    operatingState: 'CLOSED',
    voltage: '400 V',
    interlockStatus: 'NOT_APPLICABLE',
    lotoIsolationProcedure: 'Open & lock out feeder breaker C9 at Tx1 Main Control Centre. Tag #BLR2-ELEC.',
    location: 'Boiler House - Boiler 2 Bay DB',
    description: 'Feeder C9 supplying Boiler 2 ID fan, FD fans, stokers, and feed systems.'
  },
  {
    id: 'C10',
    code: 'C10',
    name: 'MCC 4 (Fermentation & Yeast)',
    category: 'BREAKER',
    groupSection: 'TX1',
    transformerSource: 'Tx1',
    parentNodeId: 'BUS_TX1',
    feederPanelId: 'MCC 4',
    brand: 'Unrecorded',
    model: 'Nameplate Unrecorded',
    breakerType: 'Unrecorded',
    ratedAmps: null,
    operatingState: 'CLOSED',
    voltage: '400 V',
    interlockStatus: 'NOT_APPLICABLE',
    lotoIsolationProcedure: 'Open & lock out feeder breaker C10 at Tx1 Main Control Centre. Verify dead at MCC 4 busbar.',
    location: 'Fermentation Bay / MCC 4 Room',
    description: 'Feeder C10 supplying Fermenters 1-6 agitators, yeast propagation, mash pumps, and turbine/ferm fans.'
  },

  // =========================================================================
  // TIER 3B: TRANSFORMER 2 PATH (800 kVA)
  // =========================================================================
  {
    id: 'TX2_FUSE',
    code: 'Tx2 Fuse',
    name: 'Tx2 Fuse | 80 A',
    category: 'HV_FUSE',
    groupSection: 'TX2',
    transformerSource: 'Tx2',
    parentNodeId: 'BUS_11KV',
    brand: 'Oil-Immersed Switchgear',
    model: 'Fused Switch-Disconnector',
    breakerType: 'Fused Switch-Disconnector',
    frameSize: '80 A HV Fuse',
    ratedAmps: 80,
    operatingState: 'CLOSED',
    voltage: '11 kV',
    interlockStatus: 'NOT_APPLICABLE',
    lotoIsolationProcedure: 'Open C5 LV incomer first, then isolate Tx2 HV fused switch-disconnector.',
    location: 'Main Substation HV Bay 2',
    description: '80 A Oil-immersed Fused Switch-disconnector protecting Step-Down Transformer 2.'
  },
  {
    id: 'TX2',
    code: 'Tx2',
    name: 'Step Down Transformer : 2 (Tx2)',
    category: 'TRANSFORMER',
    groupSection: 'TX2',
    transformerSource: 'Tx2',
    parentNodeId: 'TX2_FUSE',
    brand: 'Power Transformer',
    model: '800 kVA 11000/420V',
    breakerType: 'Unrecorded',
    ratedAmps: 1100,
    operatingState: 'CLOSED',
    voltage: '11000 / 420 V',
    kva: 800,
    primaryAmps: 42,
    secondaryAmps: 1100,
    frequencyHz: 50,
    interlockStatus: 'NOT_APPLICABLE',
    lotoIsolationProcedure: 'Isolate HV Tx2 Fuse (80A) and LV C5 ACB (2500A). Confirm dead on both sides.',
    location: 'Transformer Bund 2',
    description: '800 kVA step-down transformer (11000/420V, 42A / 1100A) feeding Tx2 Main Control Centre.'
  },
  {
    id: 'C5',
    code: 'C5',
    name: 'C5 - Tx2 Main LV Incomer',
    category: 'BREAKER',
    groupSection: 'TX2',
    transformerSource: 'Tx2',
    parentNodeId: 'TX2',
    brand: 'Chint',
    model: 'NA1-3200',
    breakerType: 'ACB',
    frameSize: '3200 A Frame',
    ratedAmps: 2500,
    operatingState: 'CLOSED',
    voltage: '400 / 420 V',
    interlockStatus: 'NOT_APPLICABLE',
    lotoIsolationProcedure: 'Open C5 ACB, rack out, apply main substation padlock before servicing Tx2 MCC busbar.',
    location: 'Tx2 Main Control Centre Incomer Panel',
    description: 'Chint NA1-3200 Air Circuit Breaker (rated 2500A) feeding Tx2 Main Control Centre Busbar.'
  },
  {
    id: 'BUS_TX2',
    code: 'Tx2 MCC',
    name: 'Tx2 Main Control Centre Busbar',
    category: 'CONTROL_CENTRE',
    groupSection: 'TX2',
    transformerSource: 'Tx2',
    parentNodeId: 'C5',
    brand: 'Main Switchboard',
    model: '400V Busbar',
    breakerType: 'Unrecorded',
    ratedAmps: 2500,
    operatingState: 'CLOSED',
    voltage: '400 V',
    frequencyHz: 50,
    interlockStatus: 'NOT_APPLICABLE',
    lotoIsolationProcedure: 'Open & lock out C5 ACB. Test zero energy on all 3 phases.',
    location: 'Tx2 Main Switchroom',
    description: '400V Motor Control Centre busbar feeding MCC 2 (C11), Sub-Feeder C12 (Old WTP/Batch/Dam 1), and Boiler 1 (C13).'
  },

  // =========================================================================
  // TIER 4B: TX2 BRANCHES (C11 MCC 2, C12 -> C18/C19/C20, C13 BOILER 1)
  // =========================================================================
  {
    id: 'C11',
    code: 'C11',
    name: 'MCC 2 (General Plant Services)',
    category: 'BREAKER',
    groupSection: 'TX2',
    transformerSource: 'Tx2',
    parentNodeId: 'BUS_TX2',
    feederPanelId: 'MCC 2',
    brand: 'Unrecorded',
    model: 'Nameplate Unrecorded',
    breakerType: 'Unrecorded',
    ratedAmps: null,
    operatingState: 'CLOSED',
    voltage: '400 V',
    interlockStatus: 'NOT_APPLICABLE',
    lotoIsolationProcedure: 'Trip & lock out C11 at Tx2 MCC switchboard.',
    location: 'Central Plant Services Substation',
    description: 'Feeder C11 supplying auxiliary distillery services, general lighting, and utility pumps.'
  },
  {
    id: 'C12',
    code: 'C12',
    name: 'C12 - Old WTP, Batch Plant & Dam 1 Feeder',
    category: 'BREAKER',
    groupSection: 'TX2',
    transformerSource: 'Tx2',
    parentNodeId: 'BUS_TX2',
    brand: 'Unrecorded',
    model: 'Nameplate Unrecorded',
    breakerType: 'Unrecorded',
    ratedAmps: null,
    operatingState: 'CLOSED',
    voltage: '400 V',
    interlockStatus: 'NOT_APPLICABLE',
    lotoIsolationProcedure: 'Opening C12 de-energizes Old Water Treatment Plant (C18), Batch Plant (C19), and Dam 1 (C20) simultaneously.',
    location: 'Tx2 Main Switchboard - Feeder C12',
    description: 'Main upstream feeder breaker splitting to C18 (Old WTP), C19 (Batch Plant), and C20 (Dam 1 Slops).'
  },
  {
    id: 'C18',
    code: 'C18',
    name: 'OLD WATER TREATMENT PLANT',
    category: 'BREAKER',
    groupSection: 'TX2',
    transformerSource: 'Tx2',
    parentNodeId: 'C12',
    feederPanelId: 'Old Water Treatment Plant',
    brand: 'Unrecorded',
    model: 'Nameplate Unrecorded',
    breakerType: 'Unrecorded',
    ratedAmps: null,
    operatingState: 'CLOSED',
    voltage: '400 V',
    interlockStatus: 'NOT_APPLICABLE',
    lotoIsolationProcedure: 'Open & lock C18 sub-breaker (or upstream C12). Notify Water Plant Operator before isolating river/RO pumps.',
    location: 'Old Water Treatment Plant Control Room',
    description: 'Sub-feeder C18 off C12 powering Great Usuthu river intake pumps, sand filters, RO skid, and Mahlabaneni community water.'
  },
  {
    id: 'C19',
    code: 'C19',
    name: 'BATCH PLANT',
    category: 'BREAKER',
    groupSection: 'TX2',
    transformerSource: 'Tx2',
    parentNodeId: 'C12',
    feederPanelId: 'Batch Plant',
    brand: 'Unrecorded',
    model: 'Nameplate Unrecorded',
    breakerType: 'Unrecorded',
    ratedAmps: null,
    operatingState: 'CLOSED',
    voltage: '400 V',
    interlockStatus: 'NOT_APPLICABLE',
    lotoIsolationProcedure: 'Open & lock C19 sub-breaker (or upstream C12). Verify zero energy at Green Tank / Batch DB.',
    location: 'Batch Plant / Tank Farm Substation',
    description: 'Sub-feeder C19 off C12 powering Green Tank, CMS/Molasses tanks, and batch mixing drives.'
  },
  {
    id: 'C20',
    code: 'C20',
    name: 'DAM 1 (slops)',
    category: 'BREAKER',
    groupSection: 'TX2',
    transformerSource: 'Tx2',
    parentNodeId: 'C12',
    feederPanelId: 'Dam 1 (slops)',
    brand: 'Unrecorded',
    model: 'Nameplate Unrecorded',
    breakerType: 'Unrecorded',
    ratedAmps: null,
    operatingState: 'CLOSED',
    voltage: '400 V',
    interlockStatus: 'NOT_APPLICABLE',
    lotoIsolationProcedure: 'Open & lock C20 sub-breaker (or upstream C12). Lock field isolator at Molasses Dam 1 kiosk.',
    location: 'Molasses Dam 1 & Offloading Kiosk',
    description: 'Sub-feeder C20 off C12 powering Dam 1 mono/vane pumps and molasses road tanker offloading bay.'
  },
  {
    id: 'C13',
    code: 'C13',
    name: 'Boiler 1 Electrical Board',
    category: 'BREAKER',
    groupSection: 'TX2',
    transformerSource: 'Tx2',
    parentNodeId: 'BUS_TX2',
    feederPanelId: 'Boiler 1',
    brand: 'Unrecorded',
    model: 'Nameplate Unrecorded',
    breakerType: 'Unrecorded',
    ratedAmps: null,
    operatingState: 'CLOSED',
    voltage: '400 V',
    interlockStatus: 'NOT_APPLICABLE',
    lotoIsolationProcedure: 'Open & lock out C13 at Tx2 Main Control Centre. Tag #BLR1-MAIN.',
    location: 'Boiler House - Boiler 1 Bay DB',
    description: 'Feeder C13 supplying Boiler 1 75kW ID fan, FD fans, coal stokers, and feed pumps.'
  },

  // =========================================================================
  // TIER 3C: TRANSFORMER 3 PATH (800 kVA)
  // =========================================================================
  {
    id: 'TX3_FUSE',
    code: 'Tx3 Fuse',
    name: 'Tx3 Fuse | 80 A',
    category: 'HV_FUSE',
    groupSection: 'TX3',
    transformerSource: 'Tx3',
    parentNodeId: 'BUS_11KV',
    brand: 'Oil-Immersed Switchgear',
    model: 'Fused Switch-Disconnector',
    breakerType: 'Fused Switch-Disconnector',
    frameSize: '80 A HV Fuse',
    ratedAmps: 80,
    operatingState: 'CLOSED',
    voltage: '11 kV',
    interlockStatus: 'NOT_APPLICABLE',
    lotoIsolationProcedure: 'Open C6 LV incomer first, then isolate Tx3 HV fused switch-disconnector.',
    location: 'Main Substation HV Bay 3',
    description: '80 A Oil-immersed Fused Switch-disconnector protecting Step-Down Transformer 3.'
  },
  {
    id: 'TX3',
    code: 'Tx3',
    name: 'Step Down Transformer : 3 (Tx3)',
    category: 'TRANSFORMER',
    groupSection: 'TX3',
    transformerSource: 'Tx3',
    parentNodeId: 'TX3_FUSE',
    brand: 'Power Transformer',
    model: '800 kVA 11000/420V',
    breakerType: 'Unrecorded',
    ratedAmps: 1100,
    operatingState: 'CLOSED',
    voltage: '11000 / 420 V',
    kva: 800,
    primaryAmps: 41.99,
    secondaryAmps: 1100,
    frequencyHz: 50,
    interlockStatus: 'NOT_APPLICABLE',
    lotoIsolationProcedure: 'Isolate HV Tx3 Fuse (80A) and LV C6 ACB (2500A) before servicing transformer.',
    location: 'Transformer Bund 3',
    description: '800 kVA step-down transformer (11000/420V, 41.99A / 1100A) feeding Tx3 Main Control Centre.'
  },
  {
    id: 'C6',
    code: 'C6',
    name: 'C6 - Tx3 Main LV Incomer',
    category: 'BREAKER',
    groupSection: 'TX3',
    transformerSource: 'Tx3',
    parentNodeId: 'TX3',
    brand: 'Chint',
    model: 'NA1-3200',
    breakerType: 'ACB',
    frameSize: '3200 A Frame',
    ratedAmps: 2500,
    operatingState: 'CLOSED',
    voltage: '400 / 420 V',
    interlockStatus: 'NOT_APPLICABLE',
    lotoIsolationProcedure: 'Open C6 ACB, rack out, apply main substation padlock before work on Tx3 MCC busbar.',
    location: 'Tx3 Main Control Centre Incomer Panel',
    description: 'Chint NA1-3200 Air Circuit Breaker (rated 2500A) feeding Tx3 Main Control Centre Busbar.'
  },
  {
    id: 'BUS_TX3',
    code: 'Tx3 MCC',
    name: 'Tx3 Main Control Centre Busbar',
    category: 'CONTROL_CENTRE',
    groupSection: 'TX3',
    transformerSource: 'Tx3',
    parentNodeId: 'C6',
    brand: 'Main Switchboard',
    model: '400V Busbar',
    breakerType: 'Unrecorded',
    ratedAmps: 2500,
    operatingState: 'CLOSED',
    voltage: '400 V',
    frequencyHz: 50,
    interlockStatus: 'NOT_APPLICABLE',
    lotoIsolationProcedure: 'Open & lock out C6 ACB. Prove zero energy on Tx3 busbars.',
    location: 'Tx3 Main Switchroom',
    description: '400V Motor Control Centre busbar feeding MCC 3 (C14), Compressors Sub DB1 (C15), Boiler 3 (C16), and New WTP (C17).'
  },

  // =========================================================================
  // TIER 4C: TX3 BRANCHES (C14 MCC 3, C15 COMPRESSORS, C16 BLR 3, C17 NEW WTP)
  // =========================================================================
  {
    id: 'C14',
    code: 'C14',
    name: 'MCC 3 (Rectifier & Cooling Towers)',
    category: 'BREAKER',
    groupSection: 'TX3',
    transformerSource: 'Tx3',
    parentNodeId: 'BUS_TX3',
    feederPanelId: 'MCC 3',
    brand: 'Unrecorded',
    model: 'Nameplate Unrecorded',
    breakerType: 'Unrecorded',
    ratedAmps: null,
    operatingState: 'CLOSED',
    voltage: '400 V',
    interlockStatus: 'NOT_APPLICABLE',
    lotoIsolationProcedure: 'Open & lock out C14 at Tx3 MCC switchboard. Check voltmeter on MCC 3 panel.',
    location: 'Cooling Towers / Stillhouse MCC 3 Room',
    description: 'Feeder C14 supplying Cooling Tower cells 1-4, circulation pumps, and rectifier spirit bays.'
  },
  {
    id: 'C15',
    code: 'C15',
    name: 'Sub DB1 Compressors',
    category: 'BREAKER',
    groupSection: 'TX3',
    transformerSource: 'Tx3',
    parentNodeId: 'BUS_TX3',
    feederPanelId: 'Sub DB1 Compressors',
    brand: 'Unrecorded',
    model: 'Nameplate Unrecorded',
    breakerType: 'Unrecorded',
    ratedAmps: null,
    operatingState: 'CLOSED',
    voltage: '400 V',
    interlockStatus: 'NOT_APPLICABLE',
    lotoIsolationProcedure: 'Open & lock out C15 at Tx3 MCC switchboard. Bleed pneumatic air receivers before mechanical maintenance.',
    location: 'Compressor House Sub DB1',
    description: 'Feeder C15 supplying plant air compressors, refrigerated dryers, and universal plant pneumatic/steam loop.'
  },
  {
    id: 'C16',
    code: 'C16',
    name: 'Boiler 3 Electrical Board',
    category: 'BREAKER',
    groupSection: 'TX3',
    transformerSource: 'Tx3',
    parentNodeId: 'BUS_TX3',
    feederPanelId: 'Boiler 3',
    brand: 'Unrecorded',
    model: 'Nameplate Unrecorded',
    breakerType: 'Unrecorded',
    ratedAmps: null,
    operatingState: 'CLOSED',
    voltage: '400 V',
    interlockStatus: 'NOT_APPLICABLE',
    lotoIsolationProcedure: 'Open & lock out C16 at Tx3 MCC switchboard. Tag #BLR3-MAIN.',
    location: 'Boiler House - Boiler 3 Bay DB',
    description: 'Feeder C16 supplying Boiler 3 ID fan, FD fans, stokers, and boiler feed pumps.'
  },
  {
    id: 'C17',
    code: 'C17',
    name: 'NEW WATER TREATMENT PLANT',
    category: 'BREAKER',
    groupSection: 'TX3',
    transformerSource: 'Tx3',
    parentNodeId: 'BUS_TX3',
    feederPanelId: 'New Water Treatment Plant',
    brand: 'Unrecorded',
    model: 'Nameplate Unrecorded',
    breakerType: 'Unrecorded',
    ratedAmps: null,
    operatingState: 'CLOSED',
    voltage: '400 V',
    interlockStatus: 'NOT_APPLICABLE',
    lotoIsolationProcedure: 'Open & lock out C17 at Tx3 MCC switchboard. Confirm isolation at New WTP distribution panel.',
    location: 'New Water Treatment Plant Substation',
    description: 'Feeder C17 off Tx3 powering the New Water Treatment Plant (ready for incoming plant checklist equipment).'
  }
];

export const FEEDER_PANELS: ElectricalFeederNodeMeta[] = [
  {
    id: 'MCC 1',
    name: 'MCC 1 - Distillation & Stills',
    code: 'MCC 1',
    breakerId: 'C8',
    breakerCode: 'C8',
    breakerSpecs: 'Feeder Breaker C8 on Tx1 MCC',
    transformerSource: 'Tx1',
    voltage: '400 V',
    upstreamBreaker: 'C4 (Chint NA1-3200 2500A)',
    location: 'Distillation Substation / MCC 1',
    description: 'Wash column feed pumps, spent wash discharge, evaporator circulation & stillhouse fans.',
    lotoIsolationProcedure: 'Open & lock out C8 at Tx1 Main Control Centre.'
  },
  {
    id: 'Boiler 2',
    name: 'Boiler 2 Electrical Board',
    code: 'Boiler 2',
    breakerId: 'C9',
    breakerCode: 'C9',
    breakerSpecs: 'Feeder Breaker C9 on Tx1 MCC',
    transformerSource: 'Tx1',
    voltage: '400 V',
    upstreamBreaker: 'C4 (Chint NA1-3200 2500A)',
    location: 'Boiler House - Bay 2 Local DB',
    description: 'Boiler 2 ID fan, forced draft fans, stoker drive, and feed pumps.',
    lotoIsolationProcedure: 'Open & lock out C9 at Tx1 Main Control Centre.'
  },
  {
    id: 'MCC 4',
    name: 'MCC 4 - Fermentation Bay & Yeast',
    code: 'MCC 4',
    breakerId: 'C10',
    breakerCode: 'C10',
    breakerSpecs: 'Feeder Breaker C10 on Tx1 MCC',
    transformerSource: 'Tx1',
    voltage: '400 V',
    upstreamBreaker: 'C4 (Chint NA1-3200 2500A)',
    location: 'Fermentation Substation / MCC 4',
    description: 'Fermenters 1-6 agitators, beer well pumps, yeast propagation, and turbine/ferm fans.',
    lotoIsolationProcedure: 'Open & lock out C10 at Tx1 Main Control Centre.'
  },
  {
    id: 'MCC 2',
    name: 'MCC 2 - General Plant Services',
    code: 'MCC 2',
    breakerId: 'C11',
    breakerCode: 'C11',
    breakerSpecs: 'Feeder Breaker C11 on Tx2 MCC',
    transformerSource: 'Tx2',
    voltage: '400 V',
    upstreamBreaker: 'C5 (Chint NA1-3200 2500A)',
    location: 'Central Plant Services Substation',
    description: 'Plant utility motors, effluent sumps, and distillery auxiliary loads.',
    lotoIsolationProcedure: 'Open & lock out C11 at Tx2 Main Control Centre.'
  },
  {
    id: 'Old Water Treatment Plant',
    name: 'OLD WATER TREATMENT PLANT',
    code: 'Old WTP',
    breakerId: 'C18',
    breakerCode: 'C18 (via C12)',
    breakerSpecs: 'Sub-feeder C18 off C12 on Tx2 MCC',
    transformerSource: 'Tx2',
    voltage: '400 V',
    upstreamBreaker: 'C12 ➔ C5 (Chint NA1-3200 2500A)',
    location: 'Old Water Treatment Plant Control Room',
    description: 'All existing water treatment checklist pumps: river intake, sand filters, RO skid, & Mahlabaneni.',
    lotoIsolationProcedure: 'Open & lock C18 sub-breaker (or upstream C12).'
  },
  {
    id: 'Batch Plant',
    name: 'BATCH PLANT',
    code: 'Batch Plant',
    breakerId: 'C19',
    breakerCode: 'C19 (via C12)',
    breakerSpecs: 'Sub-feeder C19 off C12 on Tx2 MCC',
    transformerSource: 'Tx2',
    voltage: '400 V',
    upstreamBreaker: 'C12 ➔ C5 (Chint NA1-3200 2500A)',
    location: 'Batch Plant / Tank Farm Substation',
    description: 'Green Tank, CMS/Molasses bulk holding tanks, and mash batching pumps.',
    lotoIsolationProcedure: 'Open & lock C19 sub-breaker (or upstream C12).'
  },
  {
    id: 'Dam 1 (slops)',
    name: 'DAM 1 (slops)',
    code: 'Dam 1 (slops)',
    breakerId: 'C20',
    breakerCode: 'C20 (via C12)',
    breakerSpecs: 'Sub-feeder C20 off C12 on Tx2 MCC',
    transformerSource: 'Tx2',
    voltage: '400 V',
    upstreamBreaker: 'C12 ➔ C5 (Chint NA1-3200 2500A)',
    location: 'Molasses Dam 1 Kiosk',
    description: 'Dam 1 mono/vane pumps and molasses offloading bay.',
    lotoIsolationProcedure: 'Open & lock C20 sub-breaker (or upstream C12).'
  },
  {
    id: 'Boiler 1',
    name: 'Boiler 1 Electrical Board',
    code: 'Boiler 1',
    breakerId: 'C13',
    breakerCode: 'C13',
    breakerSpecs: 'Feeder Breaker C13 on Tx2 MCC',
    transformerSource: 'Tx2',
    voltage: '400 V',
    upstreamBreaker: 'C5 (Chint NA1-3200 2500A)',
    location: 'Boiler House - Bay 1 Local DB',
    description: 'Boiler 1 75kW ID fan, FD fans, stoker screw conveyors, and feed pumps.',
    lotoIsolationProcedure: 'Open & lock out C13 at Tx2 Main Control Centre.'
  },
  {
    id: 'MCC 3',
    name: 'MCC 3 - Rectifier & Cooling Towers',
    code: 'MCC 3',
    breakerId: 'C14',
    breakerCode: 'C14',
    breakerSpecs: 'Feeder Breaker C14 on Tx3 MCC',
    transformerSource: 'Tx3',
    voltage: '400 V',
    upstreamBreaker: 'C6 (Chint NA1-3200 2500A)',
    location: 'Cooling Towers / Stillhouse MCC 3 Room',
    description: 'Cooling tower cells 1-4 and condenser circulation pumps.',
    lotoIsolationProcedure: 'Open & lock out C14 at Tx3 Main Control Centre.'
  },
  {
    id: 'Sub DB1 Compressors',
    name: 'Sub DB1 Compressors',
    code: 'Sub DB1',
    breakerId: 'C15',
    breakerCode: 'C15',
    breakerSpecs: 'Feeder Breaker C15 on Tx3 MCC',
    transformerSource: 'Tx3',
    voltage: '400 V',
    upstreamBreaker: 'C6 (Chint NA1-3200 2500A)',
    location: 'Compressor House Sub DB1',
    description: 'Screw air compressors, dryers, and universal loop equipment.',
    lotoIsolationProcedure: 'Open & lock out C15 at Tx3 Main Control Centre.'
  },
  {
    id: 'Boiler 3',
    name: 'Boiler 3 Electrical Board',
    code: 'Boiler 3',
    breakerId: 'C16',
    breakerCode: 'C16',
    breakerSpecs: 'Feeder Breaker C16 on Tx3 MCC',
    transformerSource: 'Tx3',
    voltage: '400 V',
    upstreamBreaker: 'C6 (Chint NA1-3200 2500A)',
    location: 'Boiler House - Bay 3 Local DB',
    description: 'Boiler 3 ID fan, FD fans, coal stokers, and feed water pumps.',
    lotoIsolationProcedure: 'Open & lock out C16 at Tx3 Main Control Centre.'
  },
  {
    id: 'New Water Treatment Plant',
    name: 'NEW WATER TREATMENT PLANT',
    code: 'New WTP',
    breakerId: 'C17',
    breakerCode: 'C17',
    breakerSpecs: 'Feeder Breaker C17 on Tx3 MCC',
    transformerSource: 'Tx3',
    voltage: '400 V',
    upstreamBreaker: 'C6 (Chint NA1-3200 2500A)',
    location: 'New Water Treatment Plant DB',
    description: 'New Water Treatment Plant panel (pending incoming plant checklist motor additions).',
    lotoIsolationProcedure: 'Open & lock out C17 at Tx3 Main Control Centre.'
  }
];

/**
 * Legacy panel name normalization map (v1 -> v2.0)
 */
export function normalizeFeederPanelId(rawPanel?: string): FeederPanelId | null {
  if (!rawPanel) return null;
  if (rawPanel === 'Water Treatment') return 'Old Water Treatment Plant';
  if (rawPanel === 'Batch Plant & Tanks') return 'Batch Plant';
  if (rawPanel === 'Dam 1 & Offloading') return 'Dam 1 (slops)';
  const exact = FEEDER_PANELS.find(p => p.id === rawPanel);
  return exact ? exact.id : null;
}

/**
 * Deterministically maps any plant asset (from explicit feederPanel, plantArea, name, or code)
 * to its exact feeder panel, transformer, and breaker in the v2.0 SLD.
 */
export function resolveEquipmentFeederInfo(eq: Partial<Equipment>): {
  feederPanel: FeederPanelId;
  transformerSource: TransformerSource;
  feederBreaker: string;
  breakerId: string;
} {
  const normalizedExplicit = normalizeFeederPanelId(eq.feederPanel);
  if (normalizedExplicit) {
    const matched = FEEDER_PANELS.find(p => p.id === normalizedExplicit)!;
    return {
      feederPanel: matched.id,
      transformerSource: matched.transformerSource,
      feederBreaker: matched.breakerCode,
      breakerId: matched.breakerId
    };
  }

  const area = eq.plantArea || '';
  const code = (eq.code || '').toUpperCase();
  const name = (eq.name || '').toUpperCase();

  // Boiler 1 -> C13 (Tx2)
  if (area === 'Boiler 1' || code.includes('BLR1') || name.includes('BOILER 1')) {
    return { feederPanel: 'Boiler 1', transformerSource: 'Tx2', feederBreaker: 'C13', breakerId: 'C13' };
  }

  // Boiler 2 -> C9 (Tx1)
  if (area === 'Boiler 2' || code.includes('BLR2') || name.includes('BOILER 2')) {
    return { feederPanel: 'Boiler 2', transformerSource: 'Tx1', feederBreaker: 'C9', breakerId: 'C9' };
  }

  // Boiler 3 -> C16 (Tx3)
  if (area === 'Boiler 3' || code.includes('BLR3') || name.includes('BOILER 3')) {
    return { feederPanel: 'Boiler 3', transformerSource: 'Tx3', feederBreaker: 'C16', breakerId: 'C16' };
  }

  // Water Treatment -> C18 Old Water Treatment Plant (per engineering confirmation: all existing WTP motors go to Old WTP)
  if (area === 'Water Treatment' || code.includes('WTP') || name.includes('WATER') || name.includes('RIVER')) {
    return { feederPanel: 'Old Water Treatment Plant', transformerSource: 'Tx2', feederBreaker: 'C18 (via C12)', breakerId: 'C18' };
  }

  // Distillation -> C8 MCC 1 (Tx1)
  if (
    area === 'Distillation' ||
    area === 'Distillation Fans' ||
    code.includes('DIST') ||
    name.includes('DISTILLATION') ||
    name.includes('BEER') ||
    name.includes('STILL') ||
    name.includes('WASH COLUMN')
  ) {
    return { feederPanel: 'MCC 1', transformerSource: 'Tx1', feederBreaker: 'C8', breakerId: 'C8' };
  }

  // Fermentation -> C10 MCC 4 (Tx1)
  if (
    area === 'Fermentation' ||
    area === 'Fermentation/Turbine Fans' ||
    code.includes('FERM') ||
    name.includes('FERMENT') ||
    name.includes('YEAST')
  ) {
    return { feederPanel: 'MCC 4', transformerSource: 'Tx1', feederBreaker: 'C10', breakerId: 'C10' };
  }

  // Cooling Towers -> C14 MCC 3 (Tx3)
  if (
    area === 'Cooling Towers' ||
    code.includes('CT') ||
    name.includes('COOLING TOWER') ||
    name.includes('RECTIFIER') ||
    name.includes('SPIRIT')
  ) {
    return { feederPanel: 'MCC 3', transformerSource: 'Tx3', feederBreaker: 'C14', breakerId: 'C14' };
  }

  // Universal / Compressors -> C15 Sub DB1 Compressors (Tx3)
  if (
    area === 'Universal' ||
    code.includes('COMP') ||
    name.includes('COMPRESSOR') ||
    name.includes('AIR DRYER')
  ) {
    return { feederPanel: 'Sub DB1 Compressors', transformerSource: 'Tx3', feederBreaker: 'C15', breakerId: 'C15' };
  }

  // Green Tank / CMS Molasses -> C19 Batch Plant (Tx2)
  if (
    area === 'Green Tank' ||
    area === 'CMS/Molasses Tank' ||
    code.includes('GREEN') ||
    code.includes('CMS') ||
    name.includes('GREEN TANK') ||
    name.includes('CMS')
  ) {
    return { feederPanel: 'Batch Plant', transformerSource: 'Tx2', feederBreaker: 'C19 (via C12)', breakerId: 'C19' };
  }

  // Molasses Dam 1 / Offloading -> C20 Dam 1 (slops) (Tx2)
  if (
    area === 'Molasses Dam 1' ||
    area === 'Molasses Offloading Bay' ||
    code.includes('DAM1') ||
    code.includes('OFFLOAD') ||
    name.includes('DAM 1') ||
    name.includes('OFFLOADING')
  ) {
    return { feederPanel: 'Dam 1 (slops)', transformerSource: 'Tx2', feederBreaker: 'C20 (via C12)', breakerId: 'C20' };
  }

  // Fallback -> C11 MCC 2 (Tx2)
  return { feederPanel: 'MCC 2', transformerSource: 'Tx2', feederBreaker: 'C11', breakerId: 'C11' };
}

export interface NodeLoadMetrics {
  nodeId: string;
  connectedEquipment: Equipment[];
  equipmentCount: number;
  runningLoadAmps: number;      // Sum of active Operational motors' loadCurrentAmps (or rated fallback)
  connectedRatedAmps: number;   // Sum of all motors' ratedCurrentAmps
  effectiveDisplayAmps: number; // Manual measuredLoadAmps override if set, else runningLoadAmps
  isMeasuredOverride: boolean;
  totalKw: number;
  operationalCount: number;
  maintenanceCount: number;
  activeJobCards: number;
  utilizationPct: number | null;
}

/**
 * Computes electrical load (Amps & kW) for ANY node in the v2.0 hierarchy,
 * rolling up downstream leaf feeders to parent breakers (C12, C4, C5, C6, Tx1-Tx3, HV Bus).
 */
export function computeNodeLoadMetrics(
  node: PowerDistributionNode,
  allNodes: PowerDistributionNode[],
  equipmentList: Equipment[]
): NodeLoadMetrics {
  // Determine which FeederPanelIds roll up into this node
  const getDescendantPanelIds = (targetId: string): FeederPanelId[] => {
    const target = allNodes.find(n => n.id === targetId);
    if (!target) return [];
    if (target.feederPanelId) return [target.feederPanelId];

    switch (targetId) {
      case 'C12':
        return ['Old Water Treatment Plant', 'Batch Plant', 'Dam 1 (slops)'];
      case 'C4':
      case 'TX1':
      case 'TX1_FUSE':
      case 'BUS_TX1':
        return ['MCC 1', 'Boiler 2', 'MCC 4'];
      case 'GEN_SET':
      case 'C7': {
        // Gen set carries Tx1 MCC loads when C7 is CLOSED
        const c7 = allNodes.find(n => n.id === 'C7');
        return c7?.operatingState === 'CLOSED' ? ['MCC 1', 'Boiler 2', 'MCC 4'] : [];
      }
      case 'C5':
      case 'TX2':
      case 'TX2_FUSE':
      case 'BUS_TX2':
        return ['MCC 2', 'Old Water Treatment Plant', 'Batch Plant', 'Dam 1 (slops)', 'Boiler 1'];
      case 'C6':
      case 'TX3':
      case 'TX3_FUSE':
      case 'BUS_TX3':
        return ['MCC 3', 'Sub DB1 Compressors', 'Boiler 3', 'New Water Treatment Plant'];
      case 'BUS_11KV':
      case 'C2':
      case 'EEC_SUPPLY':
      case 'METERING_TX':
      case 'C3':
      case 'NEW_TURBINE':
        return FEEDER_PANELS.map(p => p.id);
      default:
        return [];
    }
  };

  const panelIds = getDescendantPanelIds(node.id);
  const connectedEquipment = equipmentList.filter(eq => {
    const resolved = resolveEquipmentFeederInfo(eq);
    return panelIds.includes(resolved.feederPanel);
  });

  let runningLoadAmps = 0;
  let connectedRatedAmps = 0;
  let totalKw = 0;
  let operationalCount = 0;
  let maintenanceCount = 0;
  let activeJobCards = 0;

  for (const eq of connectedEquipment) {
    const rated = Number(eq.ratedCurrentAmps) || 0;
    const load = Number(eq.loadCurrentAmps) || rated;
    const kw = Number(eq.powerKw) || 0;

    connectedRatedAmps += rated;
    totalKw += kw;
    activeJobCards += eq.activeJobCardsCount || 0;

    if (eq.status === 'Operational') {
      operationalCount++;
      runningLoadAmps += load;
    } else if (eq.status === 'Under Maintenance') {
      maintenanceCount++;
    }
  }

  // Scale HV primary current if inspecting 11kV transformer/fuse/breaker (~400V / 11000V ratio)
  const isHvAmpsScale =
    node.id === 'TX1_FUSE' ||
    node.id === 'TX2_FUSE' ||
    node.id === 'TX3_FUSE' ||
    node.id === 'BUS_11KV' ||
    node.id === 'C2' ||
    node.id === 'C3' ||
    node.id === 'NEW_TURBINE';

  const scaledRunningAmps = isHvAmpsScale ? runningLoadAmps * (415 / 11000) : runningLoadAmps;
  const scaledRatedAmps = isHvAmpsScale ? connectedRatedAmps * (415 / 11000) : connectedRatedAmps;

  const isMeasuredOverride = typeof node.measuredLoadAmps === 'number' && !Number.isNaN(node.measuredLoadAmps);
  const effectiveDisplayAmps = isMeasuredOverride
    ? Number(node.measuredLoadAmps!.toFixed(1))
    : Number(scaledRunningAmps.toFixed(1));

  const utilizationPct =
    node.ratedAmps && node.ratedAmps > 0
      ? Math.min(999, Math.round((effectiveDisplayAmps / node.ratedAmps) * 100))
      : null;

  return {
    nodeId: node.id,
    connectedEquipment,
    equipmentCount: connectedEquipment.length,
    runningLoadAmps: Number(scaledRunningAmps.toFixed(1)),
    connectedRatedAmps: Number(scaledRatedAmps.toFixed(1)),
    effectiveDisplayAmps,
    isMeasuredOverride,
    totalKw: Number(totalKw.toFixed(1)),
    operationalCount,
    maintenanceCount,
    activeJobCards,
    utilizationPct
  };
}

export interface ElectricalHazardAlert {
  id: string;
  severity: 'CRITICAL' | 'HIGH' | 'WARNING';
  title: string;
  message: string;
  affectedNodeIds: string[];
  actionRequired: string;
}

/**
 * Active Plant Safety & Engineering Interlock Watchdog.
 * Automatically flags:
 * 1. Missing C4 <-> C7 mechanical/electrical interlock (and CRITICAL FAULT if both CLOSED)
 * 2. Unrecorded breaker nameplates (C2, C8-C20)
 * 3. Overloaded breakers (>85% rated amps)
 */
export function evaluatePowerDistributionHazards(
  allNodes: PowerDistributionNode[],
  equipmentList: Equipment[]
): ElectricalHazardAlert[] {
  const alerts: ElectricalHazardAlert[] = [];

  const c4 = allNodes.find(n => n.id === 'C4');
  const c7 = allNodes.find(n => n.id === 'C7');

  if (c4 && c7) {
    const bothClosed = c4.operatingState === 'CLOSED' && c7.operatingState === 'CLOSED';
    const hasMissingInterlock = c4.interlockStatus === 'NONE_HAZARD' || c7.interlockStatus === 'NONE_HAZARD';

    if (bothClosed && hasMissingInterlock) {
      alerts.push({
        id: 'HAZARD-C4-C7-SIMULTANEOUS-CLOSE',
        severity: 'CRITICAL',
        title: 'DANGER: C4 (Tx1) & C7 (GEN SET) BOTH CLOSED — UN-INTERLOCKED BUS!',
        message:
          'Tx1 Main Incomer C4 and Emergency Gen Set Breaker C7 are simultaneously CLOSED without a mechanical/electrical interlock. Immediate risk of out-of-phase parallel fault, transformer back-feed, and severe arc flash on Tx1 400V Busbar!',
        affectedNodeIds: ['C4', 'C7', 'BUS_TX1', 'TX1', 'GEN_SET'],
        actionRequired: 'Immediately open either C4 or C7 and verify LOTO padlocking.'
      });
    } else if (hasMissingInterlock) {
      alerts.push({
        id: 'HAZARD-C4-C7-NO-INTERLOCK',
        severity: 'HIGH',
        title: 'HIGH-PRIORITY CORRECTION: C4 (Tx1) & C7 (Gen Set) Lack Changeover Interlock',
        message:
          'C4 (Chint 2500A) and C7 (ABB 1250A) operate independently on Tx1 400V Busbar. Electricians MUST visually verify C4 is OPEN before closing C7 (and vice versa) until a mechanical/Kirk-key interlock is installed.',
        affectedNodeIds: ['C4', 'C7', 'BUS_TX1'],
        actionRequired: 'Install changeover interlock between C4 and C7. Enforce dual-breaker LOTO verification.'
      });
    }
  }

  // Check overloaded breakers
  for (const node of allNodes) {
    if (node.category === 'BREAKER' && node.operatingState === 'CLOSED' && node.ratedAmps) {
      const metrics = computeNodeLoadMetrics(node, allNodes, equipmentList);
      if (metrics.utilizationPct !== null && metrics.utilizationPct >= 85) {
        alerts.push({
          id: `HAZARD-OVERLOAD-${node.id}`,
          severity: metrics.utilizationPct >= 100 ? 'CRITICAL' : 'HIGH',
          title: `Breaker ${node.code} High Load (${metrics.utilizationPct}% of ${node.ratedAmps}A)`,
          message: `${node.name} load (${metrics.effectiveDisplayAmps}A) is approaching/exceeding breaker rating (${node.ratedAmps}A).`,
          affectedNodeIds: [node.id],
          actionRequired: 'Verify load current with clamp meter and shed non-essential standby motors.'
        });
      }
    }
  }

  // Count unrecorded breaker nameplates
  const unrecordedBreakers = allNodes.filter(
    n => n.category === 'BREAKER' && (n.brand === 'Unrecorded' || n.ratedAmps === null)
  );
  if (unrecordedBreakers.length > 0) {
    alerts.push({
      id: 'INFO-UNRECORDED-BREAKERS',
      severity: 'WARNING',
      title: `${unrecordedBreakers.length} Circuit Breakers Missing Nameplate Specs (${unrecordedBreakers.map(b => b.code).join(', ')})`,
      message:
        'Click any breaker to record its physical brand, model, frame type (ACB/MCCB/MCB), and Ampere rating from the switchboard door.',
      affectedNodeIds: unrecordedBreakers.map(b => b.id),
      actionRequired: 'Update nameplate data on switchboard inspection.'
    });
  }

  return alerts;
}

/**
 * Returns upstream ancestor chain for breadcrumbs (e.g. 11KV BUSBAR -> Tx1 Fuse -> Tx1 -> C4 -> Tx1 MCC -> C8)
 */
export function getUpstreamChain(
  nodeId: string,
  allNodes: PowerDistributionNode[]
): PowerDistributionNode[] {
  const chain: PowerDistributionNode[] = [];
  const visited = new Set<string>();
  let curr = allNodes.find(n => n.id === nodeId);

  while (curr && !visited.has(curr.id)) {
    visited.add(curr.id);
    chain.unshift(curr);
    curr = curr.parentNodeId ? allNodes.find(n => n.id === curr!.parentNodeId) : undefined;
  }
  return chain;
}

/**
 * Legacy helper preserved for backwards compatibility
 */
export function calculateFeederPanelStats(panelId: FeederPanelId, equipmentList: Equipment[]) {
  const normalizedTarget = normalizeFeederPanelId(panelId) || panelId;
  const connectedEquipment = equipmentList.filter(eq => {
    const resolved = resolveEquipmentFeederInfo(eq);
    return resolved.feederPanel === normalizedTarget;
  });

  const totalKw = connectedEquipment.reduce((acc, eq) => acc + (eq.powerKw || 0), 0);
  const totalRatedAmps = connectedEquipment.reduce((acc, eq) => acc + (eq.ratedCurrentAmps || 0), 0);
  const operationalCount = connectedEquipment.filter(eq => eq.status === 'Operational').length;
  const maintenanceCount = connectedEquipment.filter(eq => eq.status === 'Under Maintenance').length;
  const criticalCount = connectedEquipment.filter(eq => eq.criticality === 'Critical').length;
  const activeJobCards = connectedEquipment.reduce((acc, eq) => acc + (eq.activeJobCardsCount || 0), 0);

  return {
    panelId: normalizedTarget,
    connectedEquipment,
    equipmentCount: connectedEquipment.length,
    totalKw: Number(totalKw.toFixed(1)),
    totalRatedAmps: Number(totalRatedAmps.toFixed(1)),
    operationalCount,
    maintenanceCount,
    criticalCount,
    activeJobCards
  };
}
