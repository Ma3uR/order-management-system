import pb, { authenticatedCall } from '@/app/lib/pocketbase';

// Updated regex from statusSchema (now includes periods, colons and commas)
const STATUS_NAME_REGEX = /^[a-zA-Z0-9\u0400-\u04FF\s\-()\/\.\:,]+$/;

interface StatusRecord {
  id: string;
  name: string;
  source?: string;
}

async function testStatusNames() {
  console.log('🧪 Testing all status names against Zod regex validation...\n');
  
  try {
    const statuses = await authenticatedCall(async () => {
      return await pb.collection('status_options').getFullList<StatusRecord>({
        sort: 'source,name'
      });
    });

    console.log(`📊 Found ${statuses.length} statuses to test\n`);
    
    const failingStatuses: { name: string; source?: string; reason: string }[] = [];
    const passingStatuses: { name: string; source?: string }[] = [];
    
    statuses.forEach((status) => {
      const isValid = STATUS_NAME_REGEX.test(status.name);
      
      if (isValid) {
        passingStatuses.push({ name: status.name, source: status.source });
      } else {
        // Find specific problematic characters
        const problematicChars = Array.from(status.name).filter(char => {
          return !STATUS_NAME_REGEX.test(char);
        });
        
        failingStatuses.push({
          name: status.name,
          source: status.source,
          reason: `Contains invalid characters: ${Array.from(new Set(problematicChars)).map(c => `"${c}"`).join(', ')}`
        });
      }
    });

    // Report results
    console.log('❌ **FAILING STATUS NAMES:**');
    console.log('═'.repeat(70));
    
    if (failingStatuses.length === 0) {
      console.log('✅ All status names pass validation!');
    } else {
      failingStatuses.forEach((status, index) => {
        const sourceName = getSourceName(status.source);
        console.log(`${index + 1}. "${status.name}" (${sourceName})`);
        console.log(`   🔍 ${status.reason}`);
        console.log('');
      });
    }

    console.log('\n✅ **PASSING STATUS NAMES:**');
    console.log('═'.repeat(70));
    console.log(`📊 Total: ${passingStatuses.length} statuses`);
    
    // Group by source
    const groupedPassing = groupBy(passingStatuses, 'source');
    Object.entries(groupedPassing).forEach(([source, statuses]) => {
      const sourceName = getSourceName(source);
      console.log(`\n🏪 ${sourceName}: ${statuses.length} statuses`);
      statuses.slice(0, 3).forEach(status => {
        console.log(`   • "${status.name}"`);
      });
      if (statuses.length > 3) {
        console.log(`   ... and ${statuses.length - 3} more`);
      }
    });

    // Analysis and recommendations
    console.log('\n🔧 **ANALYSIS & RECOMMENDATIONS:**');
    console.log('═'.repeat(70));
    
    if (failingStatuses.length > 0) {
      // Find all unique problematic characters
      const allProblematicChars = new Set<string>();
      failingStatuses.forEach(status => {
        Array.from(status.name).forEach(char => {
          if (!STATUS_NAME_REGEX.test(char)) {
            allProblematicChars.add(char);
          }
        });
      });

      console.log('🚨 Characters that need to be added to regex:');
      Array.from(allProblematicChars).forEach(char => {
        console.log(`   • "${char}" (Unicode: \\u${char.codePointAt(0)?.toString(16).padStart(4, '0')})`);
      });

      // Suggest updated regex
      console.log('\n💡 **SUGGESTED REGEX UPDATE:**');
      console.log('Current: /^[a-zA-Z0-9\\u0400-\\u04FF\\s\\-()\/]+$/');
      
      const additionalChars = Array.from(allProblematicChars).map(char => {
        if (char === '.') return '\\.';
        if (char === ',') return ',';
        if (char === ':') return ':';
        return char;
      }).join('');
      
      console.log(`Updated: /^[a-zA-Z0-9\\u0400-\\u04FF\\s\\-()\\/${additionalChars}]+$/`);
      
      console.log('\n📝 Or more readable with character class:');
      console.log('/^[a-zA-Z0-9\\u0400-\\u04FF\\s\\-()\\/.,:]+$/');
    } else {
      console.log('✅ Current regex is sufficient for all status names!');
    }

  } catch (error) {
    console.error('❌ Failed to test status names:', error);
  }
}

function getSourceName(source?: string): string {
  const sourceNames: Record<string, string> = {
    'pj9sejm9vqtu8xq': 'Epicentr',
    'gfzk8nxfokgu9ku': 'Prom.ua',
    '4tvf116a5aitwmb': 'Rozetka'
  };
  return sourceNames[source || ''] || 'No Source';
}

function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const groupKey = String(item[key] || 'undefined');
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}

// Main execution
testStatusNames().then(() => {
  console.log('\n✅ Status name testing completed!');
}).catch(console.error); 