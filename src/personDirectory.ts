export interface DirectoryPerson {
  id: string;
  name: string;
}

export const parseDirectoryPeople = (
  value: unknown,
  idField: "PatientID" | "DoctorID",
  nameField: "PatientName" | "DoctorName",
): DirectoryPerson[] | null => {
  if (!Array.isArray(value)) return null;

  const people: DirectoryPerson[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const person = item as Record<string, unknown>;
    const id = person[idField];
    if (
      (typeof id !== "number" && typeof id !== "string") ||
      String(id).trim() === ""
    ) {
      return null;
    }

    const nestedUser =
      person.User && typeof person.User === "object"
        ? (person.User as Record<string, unknown>)
        : null;
    const nameCandidates = [
      person[nameField],
      person.FullName,
      person.Name,
      nestedUser?.FullName,
      nestedUser?.Name,
    ];
    const name = nameCandidates.find(
      (candidate): candidate is string =>
        typeof candidate === "string" && candidate.trim() !== "",
    );
    people.push({ id: String(id), name: name?.trim() ?? "" });
  }

  return people;
};

export const getPersonLabel = (
  name: unknown,
  id: number | string,
  people: DirectoryPerson[],
): string => {
  const directName = typeof name === "string" ? name.trim() : "";
  const directoryName = people.find((person) => person.id === String(id))?.name;
  return directName || directoryName || `#${id}`;
};
