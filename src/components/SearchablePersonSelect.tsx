import React, { useMemo, useState } from "react";
import type { DirectoryPerson } from "../personDirectory.js";

interface SearchablePersonSelectProps {
  id: string;
  value: string;
  people: DirectoryPerson[];
  placeholder: string;
  noResultsMessage: string;
  disabled?: boolean;
  onChange: (personId: string) => void;
}

const getPersonDisplayName = (person: DirectoryPerson) =>
  person.name ? `${person.name} (#${person.id})` : `#${person.id}`;

export default function SearchablePersonSelect({
  id,
  value,
  people,
  placeholder,
  noResultsMessage,
  disabled = false,
  onChange,
}: SearchablePersonSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");

  const sortedPeople = useMemo(
    () =>
      [...people].sort(
        (firstPerson, secondPerson) => Number(firstPerson.id) - Number(secondPerson.id),
      ),
    [people],
  );
  const filteredPeople = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return sortedPeople;
    return sortedPeople.filter(
      (person) =>
        person.name.toLocaleLowerCase().includes(normalizedQuery) ||
        person.id.toLocaleLowerCase().includes(normalizedQuery),
    );
  }, [query, sortedPeople]);
  const selectedPerson = sortedPeople.find((person) => person.id === value);
  const inputValue = isOpen
    ? query
    : selectedPerson
      ? getPersonDisplayName(selectedPerson)
      : "";

  const selectPerson = (person: DirectoryPerson) => {
    onChange(person.id);
    setQuery("");
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <input
        id={id}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-controls={`${id}-options`}
        aria-expanded={isOpen}
        aria-required="true"
        autoComplete="off"
        disabled={disabled}
        value={inputValue}
        onFocus={() => {
          setQuery("");
          setIsOpen(true);
        }}
        onBlur={() => {
          window.setTimeout(() => setIsOpen(false), 100);
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          setIsOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") setIsOpen(false);
          if (event.key === "Enter" && isOpen) {
            event.preventDefault();
            if (filteredPeople[0]) selectPerson(filteredPeople[0]);
          }
        }}
        placeholder={placeholder}
        className="w-full rounded-lg border border-outline-variant bg-surface px-3.5 py-2.5 text-start text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
      />
      {isOpen && !disabled && (
        <ul
          id={`${id}-options`}
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-outline-variant bg-white py-1 shadow-lg"
        >
          {filteredPeople.length ? (
            filteredPeople.map((person) => (
              <li key={person.id} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={person.id === value}
                  dir="auto"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectPerson(person)}
                  className="w-full px-3.5 py-2 text-start text-sm text-on-surface transition-colors hover:bg-primary/5 focus:bg-primary/5 focus:outline-none"
                >
                  {getPersonDisplayName(person)}
                </button>
              </li>
            ))
          ) : (
            <li className="px-3.5 py-2 text-sm text-secondary" role="status">
              {noResultsMessage}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
