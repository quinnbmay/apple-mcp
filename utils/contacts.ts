import { runAppleScript } from "run-applescript";

// Configuration
const CONFIG = {
	// Maximum contacts to process (increased to handle larger contact lists)
	MAX_CONTACTS: 1000,
	// Timeout for operations
	TIMEOUT_MS: 10000,
};

async function checkContactsAccess(): Promise<boolean> {
	try {
		// Simple test to check Contacts access
		const script = `
tell application "Contacts"
    return name
end tell`;

		await runAppleScript(script);
		return true;
	} catch (error) {
		console.error(
			`Cannot access Contacts app: ${error instanceof Error ? error.message : String(error)}`,
		);
		return false;
	}
}

async function requestContactsAccess(): Promise<{ hasAccess: boolean; message: string }> {
	try {
		// First check if we already have access
		const hasAccess = await checkContactsAccess();
		if (hasAccess) {
			return {
				hasAccess: true,
				message: "Contacts access is already granted."
			};
		}

		// If no access, provide clear instructions
		return {
			hasAccess: false,
			message: "Contacts access is required but not granted. Please:\n1. Open System Settings > Privacy & Security > Automation\n2. Find your terminal/app in the list and enable 'Contacts'\n3. Alternatively, open System Settings > Privacy & Security > Contacts\n4. Add your terminal/app to the allowed applications\n5. Restart your terminal and try again"
		};
	} catch (error) {
		return {
			hasAccess: false,
			message: `Error checking Contacts access: ${error instanceof Error ? error.message : String(error)}`
		};
	}
}

async function getAllNumbers(): Promise<{ [key: string]: string[] }> {
	try {
		const accessResult = await requestContactsAccess();
		if (!accessResult.hasAccess) {
			throw new Error(accessResult.message);
		}

		const script = `
tell application "Contacts"
    set contactList to {}
    set contactCount to 0

    -- Get a limited number of people to avoid performance issues
    set allPeople to people

    repeat with i from 1 to (count of allPeople)
        if contactCount >= ${CONFIG.MAX_CONTACTS} then exit repeat

        try
            set currentPerson to item i of allPeople
            set personName to name of currentPerson
            set personPhones to {}

            try
                set phonesList to phones of currentPerson
                repeat with phoneItem in phonesList
                    try
                        set phoneValue to value of phoneItem
                        if phoneValue is not "" then
                            set personPhones to personPhones & {phoneValue}
                        end if
                    on error
                        -- Skip problematic phone entries
                    end try
                end repeat
            on error
                -- Skip if no phones or phones can't be accessed
            end try

            -- Only add contact if they have phones
            if (count of personPhones) > 0 then
                set contactInfo to {name:personName, phones:personPhones}
                set contactList to contactList & {contactInfo}
                set contactCount to contactCount + 1
            end if
        on error
            -- Skip problematic contacts
        end try
    end repeat

    return contactList
end tell`;

		const result = (await runAppleScript(script)) as any;

		// Convert AppleScript result to our format
		const resultArray = Array.isArray(result) ? result : result ? [result] : [];
		const phoneNumbers: { [key: string]: string[] } = {};

		for (const contact of resultArray) {
			if (contact && contact.name && contact.phones) {
				phoneNumbers[contact.name] = Array.isArray(contact.phones)
					? contact.phones
					: [contact.phones];
			}
		}

		return phoneNumbers;
	} catch (error) {
		console.error(
			`Error getting all contacts: ${error instanceof Error ? error.message : String(error)}`,
		);
		return {};
	}
}

async function findNumber(name: string): Promise<string[]> {
	try {
		const accessResult = await requestContactsAccess();
		if (!accessResult.hasAccess) {
			throw new Error(accessResult.message);
		}

		if (!name || name.trim() === "") {
			return [];
		}

		const searchName = name.toLowerCase().trim();

		// First try exact and partial matching with AppleScript
		const script = `
tell application "Contacts"
    set matchedPhones to {}
    set searchText to "${searchName}"

    -- Get a limited number of people to search through
    set allPeople to people
    set foundExact to false
    set partialMatches to {}

    repeat with i from 1 to (count of allPeople)
        if i > ${CONFIG.MAX_CONTACTS} then exit repeat

        try
            set currentPerson to item i of allPeople
            set personName to name of currentPerson
            set lowerPersonName to (do shell script "echo " & quoted form of personName & " | tr '[:upper:]' '[:lower:]'")

            -- Check for exact match first (highest priority)
            if lowerPersonName is searchText then
                try
                    set phonesList to phones of currentPerson
                    repeat with phoneItem in phonesList
                        try
                            set phoneValue to value of phoneItem
                            if phoneValue is not "" then
                                set matchedPhones to matchedPhones & {phoneValue}
                                set foundExact to true
                            end if
                        on error
                            -- Skip problematic phone entries
                        end try
                    end repeat
                    if foundExact then exit repeat
                on error
                    -- Skip if no phones
                end try
            -- Check if search term is contained in name (partial match)
            else if lowerPersonName contains searchText or searchText contains lowerPersonName then
                try
                    set phonesList to phones of currentPerson
                    repeat with phoneItem in phonesList
                        try
                            set phoneValue to value of phoneItem
                            if phoneValue is not "" then
                                set partialMatches to partialMatches & {phoneValue}
                            end if
                        on error
                            -- Skip problematic phone entries
                        end try
                    end repeat
                on error
                    -- Skip if no phones
                end try
            end if
        on error
            -- Skip problematic contacts
        end try
    end repeat

    -- Return exact matches if found, otherwise partial matches
    if foundExact then
        return matchedPhones
    else
        return partialMatches
    end if
end tell`;

		const result = (await runAppleScript(script)) as any;
		const resultArray = Array.isArray(result) ? result : result ? [result] : [];

		// If no matches found with AppleScript, try comprehensive fuzzy matching
		if (resultArray.length === 0) {
			console.error(
				`No AppleScript matches for "${name}", trying comprehensive search...`,
			);
			const allNumbers = await getAllNumbers();

			// Helper function to clean name for better matching (remove emojis, extra chars)
			const cleanName = (name: string) => {
				return (
					name
						.toLowerCase()
						// Remove emojis and special characters
						.replace(
							/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu,
							"",
						)
						// Remove hearts and other symbols
						.replace(/[♥️❤️💙💚💛💜🧡🖤🤍🤎]/g, "")
						// Remove extra whitespace
						.replace(/\s+/g, " ")
						.trim()
				);
			};

			// Try multiple fuzzy matching strategies
			const strategies = [
				// Exact match (case insensitive)
				(personName: string) => cleanName(personName) === searchName,
				// Exact match with cleaned name vs cleaned search
				(personName: string) => {
					const cleanedPerson = cleanName(personName);
					const cleanedSearch = cleanName(name);
					return cleanedPerson === cleanedSearch;
				},
				// Starts with search term (cleaned)
				(personName: string) => cleanName(personName).startsWith(searchName),
				// Contains search term (cleaned)
				(personName: string) => cleanName(personName).includes(searchName),
				// Search term contains person name (for nicknames, cleaned)
				(personName: string) => searchName.includes(cleanName(personName)),
				// First name match (handle variations)
				(personName: string) => {
					const cleanedName = cleanName(personName);
					const firstWord = cleanedName.split(" ")[0];
					return (
						firstWord === searchName ||
						firstWord.startsWith(searchName) ||
						searchName.startsWith(firstWord) ||
						// Handle repeated)
						firstWord.replace(/(.)\1+/g, "$1") === searchName ||
						searchName.replace(/(.)\1+/g, "$1") === firstWord
					);
				},
				// Last name match
				(personName: string) => {
					const cleanedName = cleanName(personName);
					const nameParts = cleanedName.split(" ");
					const lastName = nameParts[nameParts.length - 1];
					return lastName === searchName || lastName.startsWith(searchName);
				},
				// Substring match in any word
				(personName: string) => {
					const cleanedName = cleanName(personName);
					const words = cleanedName.split(" ");
					return words.some(
						(word) =>
							word.includes(searchName) ||
							searchName.includes(word) ||
							word.replace(/(.)\1+/g, "$1") === searchName,
					);
				},
			];

			// Try each strategy until we find matches
			for (const strategy of strategies) {
				const matches = Object.keys(allNumbers).filter(strategy);
				if (matches.length > 0) {
					console.error(
						`Found ${matches.length} matches using fuzzy strategy for "${name}": ${matches.join(", ")}`,
					);
					// Return numbers from the first match for consistency
					return allNumbers[matches[0]] || [];
				}
			}
		}

		return resultArray.filter((phone: any) => phone && phone.trim() !== "");
	} catch (error) {
		console.error(
			`Error finding contact: ${error instanceof Error ? error.message : String(error)}`,
		);
		// Final fallback - try simple fuzzy matching
		try {
			const allNumbers = await getAllNumbers();
			const searchName = name.toLowerCase().trim();
			const closestMatch = Object.keys(allNumbers).find(
				(personName) =>
					personName.toLowerCase().includes(searchName) ||
					searchName.includes(personName.toLowerCase()),
			);
			if (closestMatch) {
				console.error(`Fallback found match for "${name}": ${closestMatch}`);
				return allNumbers[closestMatch];
			}
		} catch (fallbackError) {
			console.error(`Fallback search also failed: ${fallbackError}`);
		}
		return [];
	}
}

async function findContactByPhone(phoneNumber: string): Promise<string | null> {
	try {
		const accessResult = await requestContactsAccess();
		if (!accessResult.hasAccess) {
			throw new Error(accessResult.message);
		}

		if (!phoneNumber || phoneNumber.trim() === "") {
			return null;
		}

		// Normalize the phone number for comparison
		const searchNumber = phoneNumber.replace(/[^0-9+]/g, "");

		const script = `
tell application "Contacts"
    set foundName to ""
    set searchPhone to "${searchNumber}"

    -- Get a limited number of people to search through
    set allPeople to people

    repeat with i from 1 to (count of allPeople)
        if i > ${CONFIG.MAX_CONTACTS} then exit repeat
        if foundName is not "" then exit repeat

        try
            set currentPerson to item i of allPeople

            try
                set phonesList to phones of currentPerson
                repeat with phoneItem in phonesList
                    try
                        set phoneValue to value of phoneItem
                        -- Normalize phone value for comparison
                        set normalizedPhone to phoneValue

                        -- Simple phone matching
                        if normalizedPhone contains searchPhone or searchPhone contains normalizedPhone then
                            set foundName to name of currentPerson
                            exit repeat
                        end if
                    on error
                        -- Skip problematic phone entries
                    end try
                end repeat
            on error
                -- Skip if no phones
            end try
        on error
            -- Skip problematic contacts
        end try
    end repeat

    return foundName
end tell`;

		const result = (await runAppleScript(script)) as string;

		if (result && result.trim() !== "") {
			return result;
		}

		// Fallback to more comprehensive search using getAllNumbers
		const allContacts = await getAllNumbers();

		for (const [contactName, numbers] of Object.entries(allContacts)) {
			const normalizedNumbers = numbers.map((num) =>
				num.replace(/[^0-9+]/g, ""),
			);
			if (
				normalizedNumbers.some(
					(num) =>
						num === searchNumber ||
						num === `+${searchNumber}` ||
						num === `+1${searchNumber}` ||
						`+1${num}` === searchNumber ||
						searchNumber.includes(num) ||
						num.includes(searchNumber),
				)
			) {
				return contactName;
			}
		}

		return null;
	} catch (error) {
		console.error(
			`Error finding contact by phone: ${error instanceof Error ? error.message : String(error)}`,
		);
		return null;
	}
}

export default { getAllNumbers, findNumber, findContactByPhone, requestContactsAccess };
