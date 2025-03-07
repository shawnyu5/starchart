import {
  Table,
  Tr,
  Th,
  Thead,
  Tbody,
  TableContainer,
  Td,
  IconButton,
  Flex,
  Tooltip,
  Card,
  useToast,
} from '@chakra-ui/react';
import type { Record, RecordStatus } from '@prisma/client';
import {
  EditIcon,
  DeleteIcon,
  CheckCircleIcon,
  RepeatIcon,
  CopyIcon,
  TimeIcon,
  WarningIcon,
} from '@chakra-ui/icons';

interface DomainsTableProps {
  domains: Record[];
  onAction: (domaindID: number, action: DomainsTableAction) => void;
}

export type DomainsTableAction = 'EDIT' | 'DELETE' | 'RENEW';

export default function DomainsTable(props: DomainsTableProps) {
  const { domains, onAction } = props;

  const toast = useToast();

  function onCopyNameToClipboard(name: string) {
    navigator.clipboard.writeText(name);
    toast({
      title: 'Name was copied to clipboard',
      position: 'bottom-right',
      status: 'success',
    });
  }

  function renderDomainStatus(action: RecordStatus) {
    if (action === 'active') {
      return (
        <Tooltip label="Domain is live">
          <CheckCircleIcon color="green.500" boxSize="6" />
        </Tooltip>
      );
    }
    if (action === 'error') {
      return (
        <Tooltip label="Domain error">
          <WarningIcon color="brand.500" boxSize="6" />
        </Tooltip>
      );
    }
    if (action === 'pending') {
      return (
        <Tooltip label="Domain is pending">
          <Flex
            width="6"
            height="6"
            borderRadius="20"
            alignItems="center"
            justifyContent="center"
            background="yellow.500"
          >
            <TimeIcon color="white" boxSize="3" />
          </Flex>
        </Tooltip>
      );
    }
  }

  return (
    <Card p="2" mt="4">
      <TableContainer>
        <Table variant="striped" colorScheme="gray">
          <Thead>
            <Tr>
              <Th />
              <Th>Name</Th>
              <Th>Type</Th>
              <Th>Value</Th>
              <Th>Expiration date</Th>
              <Th />
            </Tr>
          </Thead>
          <Tbody>
            {domains.map((domain) => (
              <Tr key={domain.id}>
                <Td>{renderDomainStatus(domain.status)}</Td>
                <Td>
                  <Flex justifyContent="space-between" alignItems="center">
                    {domain.name}
                    <Tooltip label="Copy name to clipboard">
                      <IconButton
                        icon={<CopyIcon color="black" boxSize="5" />}
                        aria-label="Refresh domain"
                        variant="ghost"
                        ml="2"
                        onClick={() => onCopyNameToClipboard(domain.name)}
                      />
                    </Tooltip>
                  </Flex>
                </Td>
                <Td>{domain.type}</Td>
                <Td>{domain.value}</Td>
                <Td>
                  <Flex justifyContent="space-between" alignItems="center">
                    {domain.expiresAt.toLocaleDateString('en-US')}
                    <IconButton
                      icon={<RepeatIcon color="black" boxSize="5" />}
                      aria-label="Refresh domain"
                      variant="ghost"
                    />
                  </Flex>
                </Td>
                <Td>
                  <IconButton
                    onClick={() => onAction(domain.id, 'EDIT')}
                    icon={<EditIcon color="black" boxSize={5} />}
                    aria-label="Edit domain"
                    variant="ghost"
                    mr="1"
                  />
                  <IconButton
                    onClick={() => onAction(domain.id, 'DELETE')}
                    icon={<DeleteIcon color="black" boxSize={5} />}
                    aria-label="Delete domain"
                    variant="ghost"
                  />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>
    </Card>
  );
}
