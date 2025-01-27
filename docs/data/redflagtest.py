import pandas as pd

# Load the Excel file
excel_file = "C://Users/m_a_g/Desktop/REDGREEN/redgreen/data/redflagtest.xlsx"

df = pd.read_excel(excel_file)

# Function to remove None/NaN values from lists
def clean_column_values(column):
    return [value for value in column if pd.notna(value)]

# Initialize the list to hold question data
questions_data = []

# Process each row in the DataFrame
for _, row in df.iterrows():
    question = row['Question']
    
    # Extract answers and outcomes columns
    answers = clean_column_values(row[['Answer 1', 'Answer 2', 'Answer 3', 'Answer 4', 'Answer 5', 'Answer 6']].values)
    outcomes = clean_column_values(row[['Outcome 1', 'Outcome 2', 'Outcome 3', 'Outcome 4', 'Outcome 5', 'Outcome 6']].values)
    
    # Get multiplier and category values
    multiplier = row['Multiplier']
    category = row['Category']
    
    # Create the question data entry
    question_data = {
        "question": question,
        "answers": answers,
        "outcomes": outcomes,
        "multiplier": multiplier,
        "category": category
    }
    
    questions_data.append(question_data)

# Convert to JSON format
json_data = pd.Series(questions_data).to_json(orient="records", force_ascii=False)

# Save JSON to a file
output_file = r"C://Users/m_a_g/Desktop/REDGREEN/redgreen/data/questions.json"
with open(output_file, "w", encoding="utf-8") as f:
    f.write(json_data)

print("JSON file created successfully!")
