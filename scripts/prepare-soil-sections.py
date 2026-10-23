import zipfile
import xml.etree.ElementTree as ET
import os
import json

def extract_paragraphs(docx_path):
    z = zipfile.ZipFile(docx_path)
    xml_content = z.read('word/document.xml')
    root = ET.fromstring(xml_content)
    paragraphs = []
    for p in root.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p'):
        texts = [node.text for node in p.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t') if node.text]
        p_text = ''.join(texts).strip()
        if p_text:
            paragraphs.append(p_text)
    return paragraphs

print("Extracting paragraphs from docx files...")
p1 = extract_paragraphs('Notes/Soil Science-1-70-ocr.docx')
p2 = extract_paragraphs('Notes/Soil Science-71-110-ocr.docx')

os.makedirs('scratch/soil_raw_units', exist_ok=True)

# Segment boundaries:
# Unit 00: Master Exam Facts & PYQs
# From p2 paragraphs 1113 to end, PLUS p2 paragraphs 266-290, 796-820, 1030-1066
pyq_p2 = p2[1113:] + p2[266:291] + p2[796:821] + p2[1030:1067]
# Also search p1 for any previous year question sections
pyq_p1 = [p for p in p1 if any(k in p for k in ['AFO', 'JRF', 'NABARD', 'MCAER', 'BHU', 'ICAR', 'Pre PG', 'RRB'])]

unit_00_text = "\n\n".join(pyq_p2 + pyq_p1)
with open('scratch/soil_raw_units/unit_00_master_exam_facts.txt', 'w', encoding='utf-8') as f:
    f.write(unit_00_text)

# Unit 01: Soil Science Fundamentals, Rocks & Minerals
# p1 from index 60 to 485
unit_01_text = "\n\n".join(p1[60:486])
with open('scratch/soil_raw_units/unit_01_fundamentals_rocks_minerals.txt', 'w', encoding='utf-8') as f:
    f.write(unit_01_text)

# Unit 02: Soil Formation, Weathering & Pedology
# p1 from 486 to 619
unit_02_text = "\n\n".join(p1[486:620])
with open('scratch/soil_raw_units/unit_02_formation_weathering_pedology.txt', 'w', encoding='utf-8') as f:
    f.write(unit_02_text)

# Unit 03: Soil Physical Properties
# p1 from 620 to 885
unit_03_text = "\n\n".join(p1[620:886])
with open('scratch/soil_raw_units/unit_03_physical_properties.txt', 'w', encoding='utf-8') as f:
    f.write(unit_03_text)

# Unit 04: Soil Water Dynamics & Measurement
# p1 from 886 to 1340
unit_04_text = "\n\n".join(p1[886:1341])
with open('scratch/soil_raw_units/unit_04_soil_water.txt', 'w', encoding='utf-8') as f:
    f.write(unit_04_text)

# Unit 05: Soils of India & Soil Taxonomy
# p1 from 1341 to 1600
unit_05_text = "\n\n".join(p1[1341:1601])
with open('scratch/soil_raw_units/unit_05_soils_of_india_taxonomy.txt', 'w', encoding='utf-8') as f:
    f.write(unit_05_text)

# Unit 06: Soil Chemistry, Colloids & Organic Matter
# p1 from 3038 to 3100 and relevant chemistry paragraphs
unit_06_text = "\n\n".join(p1[3038:3100] + [p for p in p1 if any(k in p.lower() for k in ['cation exchange', 'anion exchange', 'cec', 'humus', 'humic', 'fulvic', 'c:n ratio', 'montmorillonite', 'kaolinite', 'illite', 'colloid'])][:150])
with open('scratch/soil_raw_units/unit_06_chemistry_colloids_om.txt', 'w', encoding='utf-8') as f:
    f.write(unit_06_text)

# Unit 07: Problematic Soils & Reclamation
# p1 from 1601 to 1966
unit_07_text = "\n\n".join(p1[1601:1967])
with open('scratch/soil_raw_units/unit_07_problematic_soils.txt', 'w', encoding='utf-8') as f:
    f.write(unit_07_text)

# Unit 08: Soil Erosion, Conservation & Watershed
# p1 from 1967 to 2122 + p2 from 1067 to 1112 (Watershed)
unit_08_text = "\n\n".join(p1[1967:2123] + p2[1067:1113])
with open('scratch/soil_raw_units/unit_08_erosion_watershed.txt', 'w', encoding='utf-8') as f:
    f.write(unit_08_text)

# Unit 09: Plant Nutrients, Manures & Fertilizers
# p1 from 2123 to 3037 + p2 from 0 to 913
unit_09_text = "\n\n".join(p1[2123:3038] + p2[0:914])
with open('scratch/soil_raw_units/unit_09_nutrients_fertilizers.txt', 'w', encoding='utf-8') as f:
    f.write(unit_09_text)

# Unit 10: Tillage & Soil Management
# p2 from 914 to 1066
unit_10_text = "\n\n".join(p2[914:1067])
with open('scratch/soil_raw_units/unit_10_tillage_management.txt', 'w', encoding='utf-8') as f:
    f.write(unit_10_text)

print("All 11 raw units segmented and saved to scratch/soil_raw_units/")
for fname in sorted(os.listdir('scratch/soil_raw_units')):
    size = os.path.getsize(os.path.join('scratch/soil_raw_units', fname))
    print(f"  - {fname} ({size} bytes)")
