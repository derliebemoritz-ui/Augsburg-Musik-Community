export class ScheduleGenerationError extends Error {}

export class EmptyLibraryError extends ScheduleGenerationError {
  constructor() {
    super(
      "Es sind keine aktiven, freigegebenen Tracks vorhanden. Es kann kein Sendeplan erzeugt werden."
    );
  }
}

export class AlreadyAiredError extends ScheduleGenerationError {
  constructor() {
    super(
      "Für diesen Tag wurden bereits Tracks gespielt - eine Neugenerierung würde die Historie verfälschen."
    );
  }
}
