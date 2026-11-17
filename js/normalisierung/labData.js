/**
 * Example of the chapter "Normalisierung": current lab results of patients
 * on hospital wards. All persons are fictitious.
 *
 * The data is stored here already normalised; normScenes.js derives the
 * un-normalised starting table and all intermediate steps from it.
 */
const LabData = {
  stations: [
    { StatNr: 3, Station: 'Kardiologie' },
    { StatNr: 5, Station: 'Innere Medizin' },
    { StatNr: 7, Station: 'Chirurgie' },
  ],
  patients: [
    { PatNr: 101, Nachname: 'Huber', Vorname: 'Anna', StatNr: 3 },
    { PatNr: 102, Nachname: 'Yilmaz', Vorname: 'Emre', StatNr: 5 },
    { PatNr: 103, Nachname: 'Bauer', Vorname: 'Lena', StatNr: 3 },
    { PatNr: 104, Nachname: 'Novak', Vorname: 'Jakob', StatNr: 7 },
  ],
  parameters: [
    { Parameter: 'Glukose', Einheit: 'mg/dl' },
    { Parameter: 'Hämoglobin', Einheit: 'g/dl' },
    { Parameter: 'CRP', Einheit: 'mg/l' },
    { Parameter: 'Kalium', Einheit: 'mmol/l' },
  ],
  measurements: [
    { PatNr: 101, Parameter: 'Glukose', Wert: '98' },
    { PatNr: 101, Parameter: 'Hämoglobin', Wert: '13,4' },
    { PatNr: 101, Parameter: 'CRP', Wert: '2,1' },
    { PatNr: 102, Parameter: 'Glukose', Wert: '141' },
    { PatNr: 102, Parameter: 'Kalium', Wert: '4,2' },
    { PatNr: 103, Parameter: 'Hämoglobin', Wert: '11,2' },
    { PatNr: 103, Parameter: 'CRP', Wert: '28,5' },
    { PatNr: 104, Parameter: 'Glukose', Wert: '87' },
    { PatNr: 104, Parameter: 'CRP', Wert: '3,0' },
  ],

  /** All values in one flat row per measurement – exactly the table in 1NF. */
  flatRows() {
    return this.measurements.map((m) => {
      const p = this.patients.find((x) => x.PatNr === m.PatNr);
      const s = this.stations.find((x) => x.StatNr === p.StatNr);
      const par = this.parameters.find((x) => x.Parameter === m.Parameter);
      return {
        PatNr: p.PatNr, Nachname: p.Nachname, Vorname: p.Vorname, StatNr: s.StatNr, Station: s.Station,
        Parameter: par.Parameter, Einheit: par.Einheit, Wert: m.Wert,
      };
    });
  },
};
