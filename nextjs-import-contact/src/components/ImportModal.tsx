import { useState } from "react";
import {
  Contact,
  ColumnMapping,
  ImportStep,
  IDENTIFY_FIELDS,
  MAP_FIELDS,
} from "@/types/contact";
import { parseCSV } from "@/utils/csvParser";
import FileUpload from "./FileUpload";

interface ImportModalProps {
  onClose: () => void;
  onImport: (contacts: Contact[]) => void;
}

export default function ImportModal({ onClose, onImport }: ImportModalProps) {
  const [step, setStep] = useState<ImportStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    fullName: "",
    email: "",
    position: "",
    company: "",
    ranking: "",
  });
  const [previewData, setPreviewData] = useState<string[][]>([]);

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    const text = await selectedFile.text();
    const lines = text.split("\n");
    const csvHeaders = lines[0].split(",").map((h) => h.trim());
    setHeaders(csvHeaders);
    setStep("identify");
  };

  const handleColumnSelect = async (
    property: keyof ColumnMapping,
    header: string
  ) => {
    const newMapping = {
      ...mapping,
      [property]: header,
    };
    setMapping(newMapping);
    if (step === "map" && file) {
      const contacts = await parseCSV(file, newMapping);
      setPreviewData(contacts.map((c) => Object.values(c)));
    }
  };

  const handleNext = async () => {
    if (step === "identify") {
      setStep("map");
    } else if (step === "map") {
      setStep("import");
    } else if (step === "import" && file) {
      try {
        const contacts = await parseCSV(file, mapping);
        onImport(contacts);
      } catch (error) {
        console.error("Error importing contacts:", error);
      }
    }
  };

  const isNextDisabled = () => {
    if (step === "identify") {
      return !mapping.fullName || !mapping.email;
    }
    return false;
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl border border-gray-800">
        <div className="p-6">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-100">
              {step === "upload" && "Upload a CSV file"}
              {step === "identify" && "Identify contacts"}
              {step === "map" && "Map properties"}
              {step === "import" && "Import contacts"}
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              {step === "upload" &&
                "Make sure the file includes contact information"}
              {step === "identify" &&
                "The properties below will be used to identify your contacts"}
              {step === "map" &&
                "Ensure that the information is mapped correctly"}
              {step === "import" && "Finalize details before importing"}
            </p>
          </div>

          {/* Content */}
          <div className="mb-6">
            {step === "upload" && (
              <FileUpload onFileSelect={handleFileSelect} />
            )}

            {(step === "identify" || step === "map") && (
              <div className="space-y-4">
                {(step === "identify" ? IDENTIFY_FIELDS : MAP_FIELDS).map(
                  (field) => (
                    <div key={field} className="flex items-center gap-4">
                      <div className="w-1/3">
                        <label className="block text-sm font-medium text-gray-300">
                          {field.charAt(0).toUpperCase() + field.slice(1)}
                        </label>
                      </div>
                      <div className="w-2/3">
                        <select
                          className="w-full rounded-md border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          value={mapping[field as keyof ColumnMapping]}
                          onChange={(e) =>
                            handleColumnSelect(
                              field as keyof ColumnMapping,
                              e.target.value
                            )
                          }
                        >
                          <option value="">Select column</option>
                          {headers.map((header) => (
                            <option key={header} value={header}>
                              {header}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )
                )}

                {step === "map" && previewData.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-sm font-medium text-gray-300 mb-2">
                      Preview
                    </h3>
                    <div className="border border-gray-700 rounded-md overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-700">
                        <thead className="bg-gray-800">
                          <tr>
                            {MAP_FIELDS.map((header) => (
                              <th
                                key={header}
                                className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider"
                              >
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-gray-900 divide-y divide-gray-800">
                          {previewData.map((row, rowIndex) => (
                            <tr key={rowIndex}>
                              {row.map((cell, cellIndex) => (
                                <td
                                  key={cellIndex}
                                  className="px-3 py-2 text-sm text-gray-300 whitespace-nowrap"
                                >
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === "import" && (
              <div className="text-center py-8">
                <p className="text-lg text-gray-100">
                  Ready to import your contacts
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  Please review the mapping and click Import to proceed
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3">
            <button
              className="px-4 py-2 text-sm text-gray-400 hover:text-gray-100 transition-colors"
              onClick={onClose}
            >
              Cancel
            </button>
            {step !== "upload" && (
              <button
                className="px-4 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                onClick={handleNext}
                disabled={isNextDisabled()}
              >
                {step === "import" ? "Import" : "Next"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
